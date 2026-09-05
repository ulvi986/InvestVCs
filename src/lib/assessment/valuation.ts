// Running the methodologies and reconciling what they say.
//
// Each methodology is run in isolation from the same derived factors, then
// blended by how much each deserves to be believed here. Where they disagree,
// the disagreement is reported rather than averaged into invisibility — a
// $1.2M spread between two methods is the most informative thing on the page.

import {
  METHODOLOGIES,
  comparableMedian,
  roundSensible,
} from "./config/methodologies";
import { FACTORS, factorWeight, stageRank } from "./config/factors";
import { QUESTION_BY_ID } from "./config/questions";
import {
  applicableQuestions,
  collectSignals,
  overallEvidenceQuality,
  scoreFactors,
  stageFromSignals,
} from "./engine";
import { detectContradictions, unresolved } from "./contradictions";
import type {
  AnswerMap,
  AssessmentResult,
  BlendWeight,
  DriverItem,
  FactorScores,
  GapItem,
  MethodologyOutcome,
  Resolution,
  RiskIndicator,
  ValuationContext,
  ValuationRange,
} from "./types";

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
/** Money in prose, rounded to two significant figures. See `roundSensible`. */
const usd = (value: number): string => {
  const rounded = roundSensible(value);
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) return `$${(rounded / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(rounded / 1_000)}k`;
  return `$${Math.round(rounded)}`;
};

/* ── Methodologies ────────────────────────────────────────────────────── */

/**
 * Below this share of the interview, no method produces a figure. Every
 * factor defaults to neutral, and neutral factors would otherwise compound
 * into a confident-looking valuation built entirely out of unasked questions.
 */
export const MINIMUM_COVERAGE = 0.2;

export function runMethodologies(ctx: ValuationContext): MethodologyOutcome[] {
  return METHODOLOGIES.map((config) => {
    const base = {
      id: config.id,
      name: config.name,
      purpose: config.purpose,
    };

    if (ctx.coverage < MINIMUM_COVERAGE) {
      return {
        ...base,
        status: "insufficient_input" as const,
        confidence: 0,
        components: [],
        assumptions: [],
        limitations: config.limitations,
        reason: `Only ${Math.round(ctx.coverage * 100)}% of the interview has been answered. Below ${Math.round(MINIMUM_COVERAGE * 100)}% there is nothing here but defaults, and a valuation built from defaults would be a fiction.`,
        headline: "Waiting on more of the interview.",
      };
    }

    if (!config.stages.includes(ctx.stage)) {
      return {
        ...base,
        status: "not_applicable" as const,
        confidence: 0,
        components: [],
        assumptions: [],
        limitations: config.limitations,
        reason: `Built for companies at a different stage. This method is meaningful from ${config.stages[0]} to ${config.stages[config.stages.length - 1]}.`,
        headline: "Not run at this stage.",
      };
    }

    const gated = config.gate?.(ctx) ?? null;
    if (gated) {
      return {
        ...base,
        status: "insufficient_input" as const,
        confidence: 0,
        components: [],
        assumptions: [],
        limitations: config.limitations,
        reason: gated,
        headline: "Not enough input to run this method.",
      };
    }

    try {
      return { ...base, status: "computed" as const, ...config.run(ctx) };
    } catch (error) {
      return {
        ...base,
        status: "insufficient_input" as const,
        confidence: 0,
        components: [],
        assumptions: [],
        limitations: config.limitations,
        reason: error instanceof Error ? error.message : "The method could not be computed from these answers.",
        headline: "Could not be computed.",
      };
    }
  });
}

/* ── Blending ─────────────────────────────────────────────────────────── */

export interface Blend {
  valuation: ValuationRange;
  weights: BlendWeight[];
  excluded: { methodologyId: string; name: string; reason: string }[];
  spread: number;
  agreement: number;
}

export function blend(outcomes: MethodologyOutcome[]): Blend {
  const computed = outcomes.filter(
    (outcome) => outcome.status === "computed" && outcome.range && outcome.range.point > 0,
  );

  const excluded = outcomes
    .filter((outcome) => outcome.status !== "computed")
    .map((outcome) => ({
      methodologyId: outcome.id,
      name: outcome.name,
      reason: outcome.reason ?? "Not run.",
    }));

  if (!computed.length) {
    return {
      valuation: { low: 0, point: 0, high: 0 },
      weights: [],
      excluded,
      spread: 1,
      agreement: 0,
    };
  }

  // A method with no confidence still gets a floor weight: it ran, and
  // silencing it entirely would hide a disagreement worth seeing.
  const weights: BlendWeight[] = computed.map((outcome) => ({
    methodologyId: outcome.id,
    name: outcome.name,
    weight: Math.max(0.08, outcome.confidence),
    rationale: `Confidence ${Math.round(outcome.confidence * 100)}% — ${outcome.purpose.toLowerCase()}`,
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  weights.forEach((w) => {
    w.weight = Math.round((w.weight / totalWeight) * 100) / 100;
  });

  const weighted = (pick: (range: ValuationRange) => number): number =>
    computed.reduce((sum, outcome, index) => sum + pick(outcome.range!) * weights[index].weight, 0);

  const points = computed.map((outcome) => outcome.range!.point).filter((value) => value > 0);
  const spread = points.length > 1 ? Math.max(...points) / Math.max(1, Math.min(...points)) : 1;
  // Reciprocal of the spread: identical answers read 100%, a 2x gap reads
  // 50%, and a 6x gap reads 17% rather than bottoming out at nothing.
  const agreement = clamp01(1 / Math.max(1, spread));

  // Methods that disagree widen the band. Two methods 3× apart do not
  // average into a confident midpoint.
  const disagreementWidening = 1 + clamp01((spread - 1) / 4) * 0.5;
  const point = weighted((range) => range.point);

  return {
    valuation: {
      low: roundSensible(Math.min(weighted((range) => range.low), point / disagreementWidening)),
      point: roundSensible(point),
      high: roundSensible(Math.max(weighted((range) => range.high), point * disagreementWidening)),
    },
    weights,
    excluded,
    spread: Math.round(spread * 100) / 100,
    agreement: Math.round(agreement * 100) / 100,
  };
}

/* ── Narrative layers ─────────────────────────────────────────────────── */

function drivers(factors: FactorScores, stage: ReturnType<typeof stageFromSignals>) {
  const ranked = FACTORS.map((config) => {
    const factor = factors[config.key];
    const weight = factorWeight(config.key, stage);
    return { factor, weight, impact: ((factor.adjusted - 50) / 50) * weight };
  }).filter((entry) => entry.factor.coverage > 0);

  const describe = (entry: (typeof ranked)[number]): DriverItem => {
    const top = entry.factor.contributions[0];
    return {
      label: entry.factor.label,
      detail: top
        ? `${top.prompt} — you answered: "${top.answerLabel}".`
        : entry.factor.definition,
      impact: clamp01(Math.abs(entry.impact) * 4),
      factor: entry.factor.key,
    };
  };

  return {
    strengths: ranked
      .filter((entry) => entry.factor.adjusted >= 58)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5)
      .map(describe),
    weaknesses: ranked
      .filter((entry) => entry.factor.adjusted <= 48)
      .sort((a, b) => a.impact - b.impact)
      .slice(0, 5)
      .map(describe),
  };
}

/** Risks read directly off the answers, not inferred from the scores. */
const SIGNAL_RISKS: { signal: string; risk: Omit<RiskIndicator, "id"> }[] = [
  {
    signal: "concentration_severe",
    risk: {
      title: "Revenue concentration",
      detail: "More than 60% of revenue sits with one customer. Losing them is losing the business, and an investor will price that in.",
      severity: "high",
      factor: "traction",
    },
  },
  {
    signal: "key_person_severe",
    risk: {
      title: "Key-person dependency",
      detail: "You reported that the company does not continue if one specific person leaves.",
      severity: "high",
      factor: "team",
    },
  },
  {
    signal: "platform_risk_severe",
    risk: {
      title: "Platform dependency",
      detail: "The product does not function without a third party you do not control.",
      severity: "high",
      factor: "technology",
    },
  },
  {
    signal: "regulatory_risk",
    risk: {
      title: "Unresolved regulatory requirement",
      detail: "Approvals are needed to sell at scale and the process has not started, or the requirements are not yet known.",
      severity: "high",
      factor: "market",
    },
  },
  {
    signal: "technical_gap",
    risk: {
      title: "No one to build the product",
      detail: "The person who would build the core product has not been found yet.",
      severity: "high",
      factor: "team",
    },
  },
  {
    signal: "cap_table_risk",
    risk: {
      title: "Unresolved equity",
      detail: "A departed founder's equity is unsettled. This blocks most funding rounds until it is fixed.",
      severity: "high",
      factor: "team",
    },
  },
  {
    signal: "claims_no_competition",
    risk: {
      title: "No competition identified",
      detail: "Every market has an incumbent, even if it is a spreadsheet. Not naming one usually means the research has not been done.",
      severity: "medium",
      factor: "competition",
    },
  },
  {
    signal: "channel_network_only",
    risk: {
      title: "Channel does not extend past your network",
      detail: "Every customer so far came from personal contacts, which does not tell you whether a repeatable channel exists.",
      severity: "medium",
      factor: "gtm",
    },
  },
  {
    signal: "buyer_unclear",
    risk: {
      title: "Buyer not identified",
      detail: "It is not yet clear who signs off on a purchase, which makes the market figure hard to trust.",
      severity: "medium",
      factor: "market",
    },
  },
  {
    signal: "no_books",
    risk: {
      title: "No financial records",
      detail: "Nothing formal is kept, so no financial claim in this assessment can be independently checked.",
      severity: "medium",
      factor: "financial",
    },
  },
  {
    signal: "outsourced_build",
    risk: {
      title: "Outsourced product development",
      detail: "The core product is built by an agency. Investors read this as capability that leaves when the invoices stop.",
      severity: "medium",
      factor: "team",
    },
  },
  {
    signal: "test_deferred",
    risk: {
      title: "Riskiest assumption deferred",
      detail: "The plan is to raise first and test the core assumption afterwards.",
      severity: "medium",
      factor: "team",
    },
  },
  {
    signal: "no_timing_catalyst",
    risk: {
      title: "No timing catalyst",
      detail: "Nothing has changed to make this possible now, which invites the question of why it has not already been built.",
      severity: "low",
      factor: "market",
    },
  },
];

function risks(ctx: ValuationContext, factors: FactorScores): RiskIndicator[] {
  const found: RiskIndicator[] = SIGNAL_RISKS.filter((entry) => ctx.signals[entry.signal] === true).map(
    (entry) => ({ id: entry.signal, ...entry.risk }),
  );

  const runway = typeof ctx.signals.runway_months === "number" ? ctx.signals.runway_months : null;
  if (runway !== null && runway < 6) {
    found.push({
      id: "short_runway",
      title: `${runway} months of runway`,
      detail: "Under six months of cash is short enough that the raise itself becomes the risk — terms get set by the calendar.",
      severity: runway < 3 ? "high" : "medium",
      factor: "financial",
    });
  }

  for (const factor of Object.values(factors)) {
    if (factor.coverage > 0 && factor.confidence < 0.25 && factor.adjusted >= 55) {
      found.push({
        id: `thin_evidence_${factor.key}`,
        title: `${factor.label} scores well on thin evidence`,
        detail: `${factor.label} reads ${factor.raw}/100 from your answers, but the evidence behind those answers is weak enough that the score has been pulled back to ${factor.adjusted}.`,
        severity: "medium",
        factor: factor.key,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}

function gaps(answers: AnswerMap, factors: FactorScores): GapItem[] {
  const signals = collectSignals(answers);
  const unanswered = applicableQuestions(signals).filter((question) => !answers[question.id]);

  return unanswered
    .map((question) => {
      const affected = question.contributes.map((c) => c.factor);
      // A gap is worth more where the factor is both under-covered and
      // carries weight in the methodologies.
      const value = clamp01(
        question.contributes.reduce(
          (sum, c) => sum + c.weight * (1 - (factors[c.factor]?.coverage ?? 0)),
          0,
        ) / 2,
      );
      return {
        questionId: question.id,
        prompt: question.prompt,
        section: question.section,
        affects: affected,
        value: Math.round(value * 100) / 100,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

/* ── The whole thing ──────────────────────────────────────────────────── */

export function evaluate(
  answers: AnswerMap,
  resolutions: Record<string, Resolution> = {},
): AssessmentResult {
  const signals = collectSignals(answers);
  const stage = stageFromSignals(signals);
  const contradictions = detectContradictions(answers);
  const factors = scoreFactors(answers, contradictions, resolutions);
  const evidenceQuality = overallEvidenceQuality(answers);

  const applicable = applicableQuestions(signals);
  const coverage = applicable.length
    ? applicable.filter((question) => answers[question.id]).length / applicable.length
    : 0;

  const ctx: ValuationContext = {
    factors,
    signals,
    stage,
    evidenceQuality,
    coverage,
    comparableMedian: comparableMedian(
      typeof signals.sector === "string" ? signals.sector : undefined,
      stage,
    ),
  };

  const methodologies = runMethodologies(ctx);
  const reconciled = blend(methodologies);

  // Overall score: stage-weighted mean of the adjusted factor scores. Only
  // factors with some coverage contribute, and the weights renormalise, so a
  // half-finished assessment is not silently penalised for its own gaps —
  // coverage is reported separately instead.
  let scoreWeighted = 0;
  let rawWeighted = 0;
  let confidenceWeighted = 0;
  let weightTotal = 0;

  for (const config of FACTORS) {
    const factor = factors[config.key];
    if (!factor || factor.coverage <= 0) continue;
    const weight = factorWeight(config.key, stage);
    scoreWeighted += factor.adjusted * weight;
    rawWeighted += factor.raw * weight;
    confidenceWeighted += factor.confidence * weight;
    weightTotal += weight;
  }

  const open = unresolved(contradictions, resolutions);
  const provisional = open.some((contradiction) => contradiction.severity === "high");

  const confidence = clamp01(
    (weightTotal ? confidenceWeighted / weightTotal : 0) *
      (0.85 + 0.15 * reconciled.agreement) *
      (provisional ? 0.75 : 1),
  );

  const overallScore = Math.round(weightTotal ? scoreWeighted / weightTotal : 50);
  const rawScore = Math.round(weightTotal ? rawWeighted / weightTotal : 50);

  const riskIndicators = risks(ctx, factors);
  const highRisks = riskIndicators.filter((risk) => risk.severity === "high").length;
  const riskLevel: AssessmentResult["riskLevel"] =
    highRisks >= 2 || confidence < 0.2 ? "high"
      : highRisks === 1 || confidence < 0.35 ? "elevated"
        : overallScore >= 62 && confidence >= 0.55 ? "low"
          : "moderate";

  const { strengths, weaknesses } = drivers(factors, stage);

  const scenarios: AssessmentResult["scenarios"] = [
    {
      key: "bear",
      label: "Bear",
      valuation: reconciled.valuation.low,
      narrative: weaknesses.length
        ? `${weaknesses[0].label} does not improve, and the weakest-evidenced claims in this assessment turn out to be optimistic.`
        : "The weakest-evidenced claims in this assessment turn out to be optimistic.",
      assumptions: [
        "Every figure that is currently self-reported comes in at the low end when checked.",
        stageRank(stage) >= 3
          ? "Growth flattens and retention slips before the next round."
          : "No further external validation arrives before the raise.",
      ],
    },
    {
      key: "base",
      label: "Base",
      valuation: reconciled.valuation.point,
      narrative: "The company is roughly what the answers describe, and executes at the pace it has been executing.",
      assumptions: [
        `Weighted across ${reconciled.weights.length} methodolog${reconciled.weights.length === 1 ? "y" : "ies"} that ran.`,
        `Sector and stage median of ${usd(ctx.comparableMedian)} holds.`,
      ],
    },
    {
      key: "bull",
      label: "Bull",
      valuation: reconciled.valuation.high,
      narrative: strengths.length
        ? `${strengths[0].label} keeps compounding, the open questions resolve in your favour, and the softer claims here are borne out when checked.`
        : "The open questions resolve in your favour and the softer claims here are borne out when checked.",
      assumptions: [
        "The gaps listed below get answered with documented evidence.",
        stageRank(stage) >= 3
          ? "Current growth holds for another two quarters on the same channel."
          : "A repeatable channel is found within the next two quarters.",
      ],
    },
  ];

  return {
    overallScore,
    rawScore,
    confidence: Math.round(confidence * 100) / 100,
    evidenceQuality,
    coverage: Math.round(coverage * 100) / 100,
    riskLevel,
    stage,
    valuation: reconciled.valuation,
    blend: {
      weights: reconciled.weights,
      excluded: reconciled.excluded,
      spread: reconciled.spread,
      agreement: reconciled.agreement,
    },
    methodologies,
    factors: FACTORS.map((config) => factors[config.key]),
    strengths,
    weaknesses,
    risks: riskIndicators,
    contradictions,
    gaps: gaps(answers, factors),
    provisional,
    scenarios,
  };
}

export const questionPrompt = (questionId: string): string =>
  QUESTION_BY_ID[questionId]?.prompt ?? questionId;
