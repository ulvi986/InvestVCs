// The scoring engine.
//
// Answers in, derived factor scores out. Three ideas do the work:
//
//  • Evidence weight. Every answer is discounted by how it was known.
//  • Coverage. A factor scored from one answer is not a factor that has been
//    assessed, and its confidence says so.
//  • Shrinkage. A high score on weak evidence is pulled toward the neutral
//    prior. That is what stops the questionnaire from being a wish list:
//    picking the strongest option everywhere raises `raw`, but without the
//    evidence and consistency to support it, `adjusted` barely moves.

import {
  EVIDENCE_WEIGHT,
  type Answer,
  type AnswerMap,
  type Contradiction,
  type Contribution,
  type EvidenceStrength,
  type FactorKey,
  type FactorScore,
  type FactorScores,
  type Question,
  type Resolution,
  type SignalState,
  type StageKey,
} from "./types";
import { FACTORS, FACTOR_BY_KEY, SECTION_BY_KEY } from "./config/factors";
import { QUESTIONS, QUESTION_BY_ID } from "./config/questions";

/** Neutral prior. An unevidenced answer is worth no more than "average". */
export const NEUTRAL = 50;

/**
 * Nothing a founder tells a form is certain, however well evidenced the
 * answer claims to be — none of it has been independently checked. A factor
 * where every question was answered from a system of record tops out here.
 */
export const CONFIDENCE_CEILING = 0.95;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/* ── Signals ──────────────────────────────────────────────────────────── */

/**
 * Replay every answer into a flat signal state. Later answers overwrite
 * earlier ones for the same key, which is what makes "go back and change it"
 * behave the way a founder expects.
 */
export function collectSignals(answers: AnswerMap): SignalState {
  const state: SignalState = {};

  for (const question of QUESTIONS) {
    const answer = answers[question.id];
    if (!answer) continue;

    if (question.kind === "number" && question.numeric) {
      if (typeof answer.value === "number" && isFinite(answer.value)) {
        state[question.numeric.signal] = answer.value;
      }
      continue;
    }

    for (const id of answer.selected ?? []) {
      const option = question.options?.find((o) => o.id === id);
      if (!option?.signals) continue;
      Object.assign(state, option.signals);
    }
  }

  return state;
}

export const stageFromSignals = (signals: SignalState): StageKey => {
  const stage = signals.stage;
  return typeof stage === "string" && ["idea", "prototype", "mvp", "revenue", "scaling"].includes(stage)
    ? (stage as StageKey)
    : "idea";
};

/* ── Applicability ────────────────────────────────────────────────────── */

export const isApplicable = (question: Question, signals: SignalState): boolean =>
  question.when ? question.when(signals) : true;

/** Every question the founder should be asked, given what they have said. */
export function applicableQuestions(signals: SignalState): Question[] {
  return QUESTIONS.filter((question) => isApplicable(question, signals));
}

/**
 * The serving order: sections in sequence, core questions before follow-ups
 * inside a section, declaration order otherwise. Branch questions appear the
 * moment the answer that unlocks them is given, so the interview widens where
 * there is something to learn and stops where there is not.
 */
export function questionQueue(answers: AnswerMap, signals: SignalState): Question[] {
  return applicableQuestions(signals)
    .filter((question) => !answers[question.id])
    .sort((a, b) => {
      const sectionDelta = (SECTION_BY_KEY[a.section]?.order ?? 0) - (SECTION_BY_KEY[b.section]?.order ?? 0);
      if (sectionDelta !== 0) return sectionDelta;
      const coreDelta = Number(Boolean(b.core)) - Number(Boolean(a.core));
      if (coreDelta !== 0) return coreDelta;
      return QUESTIONS.indexOf(a) - QUESTIONS.indexOf(b);
    });
}

export const nextQuestion = (answers: AnswerMap, signals: SignalState): Question | null =>
  questionQueue(answers, signals)[0] ?? null;

export interface Progress {
  answered: number;
  /** Answered plus still-applicable-and-unanswered. Moves as the tree branches. */
  total: number;
  ratio: number;
  /** Per-section counts, for the rail. */
  sections: { key: string; label: string; answered: number; total: number }[];
}

export function progress(answers: AnswerMap, signals: SignalState): Progress {
  const applicable = applicableQuestions(signals);
  const answered = applicable.filter((q) => answers[q.id]).length;

  const sections = Object.values(SECTION_BY_KEY)
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const inSection = applicable.filter((q) => q.section === section.key);
      return {
        key: section.key,
        label: section.label,
        answered: inSection.filter((q) => answers[q.id]).length,
        total: inSection.length,
      };
    })
    .filter((section) => section.total > 0);

  return {
    answered,
    total: applicable.length,
    ratio: applicable.length ? answered / applicable.length : 0,
    sections,
  };
}

/* ── Scoring one answer ───────────────────────────────────────────────── */

export interface ScoredAnswer {
  score: number;             // 0..1
  evidence: EvidenceStrength;
  label: string;             // what the founder said, in their words
}

/** Positional influence when scoring a ranking. Front of the list counts most. */
const RANK_POSITION_WEIGHTS = [0.32, 0.24, 0.18, 0.12, 0.08, 0.06];

export function scoreAnswer(question: Question, answer: Answer | undefined): ScoredAnswer | null {
  if (!answer) return null;

  if (question.kind === "number" && question.numeric) {
    const value = answer.value;
    if (typeof value !== "number" || !isFinite(value)) return null;
    const bucket =
      question.numeric.buckets.find((b) => value <= b.max) ??
      question.numeric.buckets[question.numeric.buckets.length - 1];
    return {
      score: clamp01(bucket?.score ?? 0.5),
      evidence: question.evidence,
      label: `${value.toLocaleString("en-US")} ${question.numeric.unit}`,
    };
  }

  if (question.kind === "rank" && question.rank) {
    const order = (answer.selected ?? []).filter((id) =>
      question.rank!.items.some((item) => item.id === id),
    );
    if (order.length < question.rank.items.length) return null;

    let total = 0;
    let weightSum = 0;
    order.forEach((itemId, position) => {
      const scores = question.rank!.positionScores[itemId];
      if (!scores) return;
      const positionWeight = RANK_POSITION_WEIGHTS[position] ?? 0.05;
      const score = scores[position] ?? scores[scores.length - 1] ?? 0.5;
      total += score * positionWeight;
      weightSum += positionWeight;
    });

    const topLabel = question.rank.items.find((item) => item.id === order[0])?.label ?? order[0];
    return {
      score: weightSum ? clamp01(total / weightSum) : 0.5,
      evidence: question.evidence,
      label: `${topLabel} ranked first`,
    };
  }

  const selected = (answer.selected ?? [])
    .map((id) => question.options?.find((o) => o.id === id))
    .filter((option): option is NonNullable<typeof option> => Boolean(option));

  if (!selected.length) return null;

  if (question.kind === "multi") {
    const noneId = question.multi?.noneOption;
    if (noneId && selected.some((o) => o.id === noneId)) {
      const option = question.options?.find((o) => o.id === noneId);
      return { score: 0, evidence: option?.evidence ?? question.evidence, label: option?.label ?? "None" };
    }
    const ceiling = (question.options ?? [])
      .filter((o) => o.id !== noneId)
      .reduce((sum, o) => sum + o.score, 0);
    const gained = selected.reduce((sum, o) => sum + o.score, 0);
    // Weakest evidence among the selected: a claim is only as good as its
    // softest supporting answer.
    const evidence = selected.reduce<EvidenceStrength>(
      (weakest, option) =>
        EVIDENCE_WEIGHT[option.evidence ?? question.evidence] < EVIDENCE_WEIGHT[weakest]
          ? (option.evidence ?? question.evidence)
          : weakest,
      question.evidence,
    );
    return {
      score: ceiling > 0 ? clamp01(gained / ceiling) : 0,
      evidence,
      label: selected.map((o) => o.label).join(" · "),
    };
  }

  const option = selected[0];
  return {
    score: clamp01(option.score),
    evidence: option.evidence ?? question.evidence,
    label: option.label,
  };
}

/** The founder's own words for a question, for quoting back at them. */
export function answerLabel(questionId: string, answers: AnswerMap): string {
  const question = QUESTION_BY_ID[questionId];
  if (!question) return "";
  return scoreAnswer(question, answers[questionId])?.label ?? "";
}

/* ── Cross-validation ─────────────────────────────────────────────────── */

/**
 * Agreement between questions that probe the same underlying thing from
 * different angles. Two answers that should track each other and do not are
 * evidence that at least one of them is not grounded, so the factor's
 * confidence falls even when neither answer is provably wrong.
 */
export function probeConsistency(
  questions: Question[],
  answers: AnswerMap,
): { byProbe: Record<string, number>; overall: number } {
  const groups = new Map<string, number[]>();

  for (const question of questions) {
    if (!question.probe) continue;
    const scored = scoreAnswer(question, answers[question.id]);
    if (!scored) continue;
    const bucket = groups.get(question.probe) ?? [];
    bucket.push(scored.score);
    groups.set(question.probe, bucket);
  }

  const byProbe: Record<string, number> = {};
  for (const [probe, scores] of groups) {
    if (scores.length < 2) continue;
    let spread = 0;
    let pairs = 0;
    for (let i = 0; i < scores.length; i += 1) {
      for (let j = i + 1; j < scores.length; j += 1) {
        spread += Math.abs(scores[i] - scores[j]);
        pairs += 1;
      }
    }
    // A 0.5 gap between two views of the same thing costs about a third of
    // the factor's confidence; identical readings cost nothing.
    byProbe[probe] = clamp01(1 - (spread / pairs) * 0.7);
  }

  const values = Object.values(byProbe);
  return {
    byProbe,
    overall: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 1,
  };
}

/* ── Factor scoring ───────────────────────────────────────────────────── */

/**
 * Shrink a raw reading toward the neutral prior in proportion to how little
 * we trust it. At confidence 1 the raw score survives intact; at confidence 0
 * it retains 55% of its distance from neutral, so evidence-free answers can
 * still move the needle a little — just not far.
 */
export const shrink = (raw: number, confidence: number): number =>
  NEUTRAL + (raw - NEUTRAL) * (0.55 + 0.45 * clamp01(confidence));

export function scoreFactors(
  answers: AnswerMap,
  contradictions: Contradiction[] = [],
  resolutions: Record<string, Resolution> = {},
): FactorScores {
  const signals = collectSignals(answers);
  const applicable = applicableQuestions(signals);
  const { byProbe } = probeConsistency(applicable, answers);

  const scores = {} as FactorScores;

  for (const factor of FACTORS) {
    const relevant = applicable.filter((q) => q.contributes.some((c) => c.factor === factor.key));

    let weightedScore = 0;
    let answeredWeight = 0;
    let applicableWeight = 0;
    let evidenceAccumulated = 0;
    const contributions: Contribution[] = [];
    const unanswered: { id: string; weight: number }[] = [];
    const probes: number[] = [];

    for (const question of relevant) {
      const contribution = question.contributes.find((c) => c.factor === factor.key);
      const weight = (contribution?.weight ?? 1) * (question.weight ?? 1);
      applicableWeight += weight;

      const scored = scoreAnswer(question, answers[question.id]);
      if (!scored) {
        unanswered.push({ id: question.id, weight });
        continue;
      }

      weightedScore += scored.score * weight;
      answeredWeight += weight;
      evidenceAccumulated += EVIDENCE_WEIGHT[scored.evidence] * weight;

      if (question.probe && byProbe[question.probe] !== undefined) probes.push(byProbe[question.probe]);

      contributions.push({
        questionId: question.id,
        prompt: question.prompt,
        answerLabel: scored.label,
        score: scored.score,
        weight,
        evidence: scored.evidence,
      });
    }

    const raw = answeredWeight > 0 ? (weightedScore / answeredWeight) * 100 : NEUTRAL;
    const coverage = applicableWeight > 0 ? clamp01(answeredWeight / applicableWeight) : 0;
    const evidenceQuality = answeredWeight > 0 ? clamp01(evidenceAccumulated / answeredWeight) : 0;
    const consistency = probes.length ? probes.reduce((a, b) => a + b, 0) / probes.length : 1;

    // Unresolved contradictions cut confidence. A founder who explains one
    // rather than correcting it gets half the penalty back — the explanation
    // is information, but it is not the same as the numbers agreeing.
    let contradictionMultiplier = 1;
    for (const contradiction of contradictions) {
      if (!contradiction.affects.includes(factor.key)) continue;
      const resolution = resolutions[contradiction.ruleId];
      if (resolution?.outcome === "corrected") continue;
      contradictionMultiplier *= resolution?.outcome === "explained"
        ? Math.sqrt(contradiction.penalty)
        : contradiction.penalty;
    }

    const confidence = Math.min(
      CONFIDENCE_CEILING,
      clamp01(Math.pow(evidenceQuality, 0.9) * Math.sqrt(coverage) * consistency * contradictionMultiplier),
    );

    scores[factor.key] = {
      key: factor.key,
      label: factor.label,
      definition: factor.definition,
      raw: Math.round(raw),
      adjusted: Math.round(shrink(raw, confidence)),
      confidence: Math.round(confidence * 100) / 100,
      evidenceQuality: Math.round(evidenceQuality * 100) / 100,
      coverage: Math.round(coverage * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      contributions: contributions.sort((a, b) => b.weight * b.score - a.weight * a.score),
      unanswered: unanswered.sort((a, b) => b.weight - a.weight).map((u) => u.id),
    };
  }

  return scores;
}

/** 0..1 across every answer given, used as the headline evidence figure. */
export function overallEvidenceQuality(answers: AnswerMap): number {
  const signals = collectSignals(answers);
  let weighted = 0;
  let total = 0;

  for (const question of applicableQuestions(signals)) {
    const scored = scoreAnswer(question, answers[question.id]);
    if (!scored) continue;
    const weight = question.contributes.reduce((sum, c) => sum + c.weight, 0) || 1;
    weighted += EVIDENCE_WEIGHT[scored.evidence] * weight;
    total += weight;
  }

  return total > 0 ? Math.round((weighted / total) * 100) / 100 : 0;
}

export const factorLabel = (key: FactorKey): string => FACTOR_BY_KEY[key]?.label ?? key;
