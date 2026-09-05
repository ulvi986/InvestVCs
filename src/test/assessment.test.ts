// The assessment engine.
//
// Two things are worth testing here beyond the arithmetic: that the config is
// internally consistent (a question pointing at a factor that does not exist
// would fail silently), and that the anti-gaming machinery actually bites —
// answering everything with the strongest option should not, on its own,
// produce a confident valuation.

import { describe, it, expect } from "vitest";

import {
  CONFIDENCE_CEILING,
  CONTRADICTION_RULES,
  toAnalystInputs,
  FACTOR_KEYS,
  METHODOLOGIES,
  QUESTIONS,
  QUESTION_BY_ID,
  applicableQuestions,
  collectSignals,
  detectContradictions,
  evaluate,
  nextQuestion,
  progress,
  roundSensible,
  scoreAnswer,
  scoreFactors,
  shrink,
  spreadFrom,
  stageFromSignals,
  type AnswerMap,
} from "@/lib/assessment";
import { computeBerkus } from "@/lib/analyst/methodologies/berkus";
import { SCORECARD_SCORE_VALUES } from "@/lib/analyst/methodologies/scorecard";
import { RISK_SCORE_VALUES } from "@/lib/analyst/methodologies/riskFactor";

/* ── Helpers ──────────────────────────────────────────────────────────── */

const at = new Date("2026-01-01T00:00:00.000Z").toISOString();

const pick = (map: AnswerMap, questionId: string, ...optionIds: string[]): AnswerMap => ({
  ...map,
  [questionId]: { questionId, selected: optionIds, answeredAt: at },
});

const enter = (map: AnswerMap, questionId: string, value: number): AnswerMap => ({
  ...map,
  [questionId]: { questionId, value, answeredAt: at },
});

/** Answer every applicable question with its highest-scoring option. */
function maximise(seed: AnswerMap = {}): AnswerMap {
  let answers = seed;
  for (let pass = 0; pass < 6; pass += 1) {
    const questions = applicableQuestions(collectSignals(answers));
    for (const question of questions) {
      if (answers[question.id]) continue;
      if (question.kind === "number" && question.numeric) {
        const best = question.numeric.buckets.reduce((a, b) => (b.score > a.score ? b : a));
        const value = isFinite(best.max) ? best.max : 1_000_000;
        answers = enter(answers, question.id, value);
      } else if (question.kind === "rank" && question.rank) {
        answers = pick(answers, question.id, ...question.rank.items.map((item) => item.id));
      } else if (question.kind === "multi") {
        const noneId = question.multi?.noneOption;
        answers = pick(
          answers,
          question.id,
          ...(question.options ?? []).filter((o) => o.id !== noneId).map((o) => o.id),
        );
      } else {
        const best = (question.options ?? []).reduce((a, b) => (b.score > a.score ? b : a));
        answers = pick(answers, question.id, best.id);
      }
    }
  }
  return answers;
}

/* ── Config integrity ─────────────────────────────────────────────────── */

describe("question bank", () => {
  it("has unique ids", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only contributes to factors that exist", () => {
    for (const question of QUESTIONS) {
      for (const contribution of question.contributes) {
        expect(FACTOR_KEYS).toContain(contribution.factor);
      }
    }
  });

  it("gives every choice question options, and every option a 0..1 score", () => {
    for (const question of QUESTIONS) {
      if (question.kind === "single" || question.kind === "multi") {
        expect(question.options?.length ?? 0).toBeGreaterThan(1);
        for (const option of question.options ?? []) {
          expect(option.score).toBeGreaterThanOrEqual(0);
          expect(option.score).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("names a real option as the multi-select escape hatch", () => {
    for (const question of QUESTIONS) {
      if (!question.multi?.noneOption) continue;
      expect(question.options?.some((o) => o.id === question.multi!.noneOption)).toBe(true);
    }
  });

  it("closes every numeric scale with an unbounded final bucket", () => {
    for (const question of QUESTIONS) {
      if (question.kind !== "number" || !question.numeric) continue;
      const buckets = question.numeric.buckets;
      expect(buckets.length).toBeGreaterThan(0);
      expect(buckets[buckets.length - 1].max).toBe(Infinity);
      for (let i = 1; i < buckets.length; i += 1) {
        expect(buckets[i].max).toBeGreaterThan(buckets[i - 1].max);
      }
    }
  });

  it("scores every rank item at every position it can occupy", () => {
    for (const question of QUESTIONS) {
      if (question.kind !== "rank" || !question.rank) continue;
      for (const item of question.rank.items) {
        const scores = question.rank.positionScores[item.id];
        expect(scores, `${question.id}/${item.id}`).toBeDefined();
        expect(scores.length).toBe(question.rank.items.length);
      }
    }
  });

  it("cross-validates at least two questions per probe group", () => {
    const groups = new Map<string, number>();
    for (const question of QUESTIONS) {
      if (!question.probe) continue;
      groups.set(question.probe, (groups.get(question.probe) ?? 0) + 1);
    }
    expect(groups.size).toBeGreaterThan(2);
    for (const [probe, count] of groups) {
      expect(count, probe).toBeGreaterThan(1);
    }
  });

  it("points every contradiction rule at real questions and factors", () => {
    for (const rule of CONTRADICTION_RULES) {
      expect(FACTOR_KEYS).toEqual(expect.arrayContaining(rule.affects));
      expect(rule.penalty).toBeGreaterThan(0);
      expect(rule.penalty).toBeLessThanOrEqual(1);
    }
  });
});

/* ── Adaptivity ───────────────────────────────────────────────────────── */

describe("adaptive questionnaire", () => {
  it("opens on a core question and never serves an answered one", () => {
    const first = nextQuestion({}, {});
    expect(first?.core).toBe(true);
    const answers = pick({}, first!.id, first!.options![0].id);
    expect(nextQuestion(answers, collectSignals(answers))?.id).not.toBe(first!.id);
  });

  it("does not ask a pre-product company about revenue retention", () => {
    const answers = pick({}, "stage_state", "concept");
    const ids = applicableQuestions(collectSignals(answers)).map((q) => q.id);
    expect(ids).not.toContain("revenue_mrr");
    expect(ids).not.toContain("churn");
    expect(ids).not.toContain("users_total");
    expect(ids).toContain("validation_strongest");
  });

  it("opens the revenue branch once the company reports paying customers", () => {
    const answers = pick({}, "stage_state", "paying");
    const ids = applicableQuestions(collectSignals(answers)).map((q) => q.id);
    expect(ids).toContain("revenue_mrr");
    expect(ids).toContain("churn");
    expect(ids).not.toContain("validation_strongest");
  });

  it("reports progress against the branch the founder is actually on", () => {
    const answers = pick({}, "stage_state", "concept");
    const state = progress(answers, collectSignals(answers));
    expect(state.answered).toBe(1);
    expect(state.total).toBeGreaterThan(state.answered);
    expect(state.sections.some((section) => section.key === "traction")).toBe(true);
  });
});

/* ── Answer scoring ───────────────────────────────────────────────────── */

describe("answer scoring", () => {
  it("buckets a numeric answer rather than reading it as a score", () => {
    const question = QUESTION_BY_ID.team_fulltime;
    expect(scoreAnswer(question, { questionId: question.id, value: 2, answeredAt: at })?.score).toBe(1);
    expect(scoreAnswer(question, { questionId: question.id, value: 0, answeredAt: at })?.score).toBeLessThan(0.2);
  });

  it("scores a multi-select on how much is covered, not on the mean", () => {
    const question = QUESTION_BY_ID.team_gaps;
    const one = scoreAnswer(question, { questionId: question.id, selected: ["engineering"], answeredAt: at });
    const three = scoreAnswer(question, {
      questionId: question.id,
      selected: ["engineering", "design", "sales"],
      answeredAt: at,
    });
    expect(one!.score).toBeLessThan(three!.score);
    expect(three!.score).toBeCloseTo(0.6, 5);
  });

  it("takes a multi-select's evidence from its weakest selected option", () => {
    const question = QUESTION_BY_ID.team_gaps;
    const scored = scoreAnswer(question, { questionId: question.id, selected: ["none"], answeredAt: at });
    expect(scored!.score).toBe(0);
  });

  it("weights the front of a ranking most heavily", () => {
    const question = QUESTION_BY_ID.moat_rank;
    const durable = scoreAnswer(question, {
      questionId: question.id,
      selected: ["network_effects", "proprietary_data", "switching_costs", "technology", "brand", "execution_speed"],
      answeredAt: at,
    });
    const flimsy = scoreAnswer(question, {
      questionId: question.id,
      selected: ["execution_speed", "brand", "technology", "switching_costs", "proprietary_data", "network_effects"],
      answeredAt: at,
    });
    expect(durable!.score).toBeGreaterThan(flimsy!.score);
  });

  it("refuses a partial ranking rather than scoring it", () => {
    const question = QUESTION_BY_ID.moat_rank;
    expect(scoreAnswer(question, { questionId: question.id, selected: ["brand"], answeredAt: at })).toBeNull();
  });
});

/* ── Evidence and shrinkage ───────────────────────────────────────────── */

describe("confidence and shrinkage", () => {
  it("leaves a fully trusted reading alone and pulls an untrusted one toward neutral", () => {
    expect(shrink(90, 1)).toBeCloseTo(90, 5);
    expect(shrink(90, 0)).toBeCloseTo(72, 5);
    expect(shrink(50, 0)).toBe(50);
  });

  it("scores the same answer lower in confidence when the evidence is weaker", () => {
    const strong = pick(pick({}, "market_sam", "x"), "market_basis", "official");
    const weak = pick({}, "market_basis", "estimate");
    const strongFactors = scoreFactors({ ...strong, market_sam: { questionId: "market_sam", value: 40_000_000, answeredAt: at } });
    const weakFactors = scoreFactors({ ...weak, market_sam: { questionId: "market_sam", value: 40_000_000, answeredAt: at } });
    expect(strongFactors.market.confidence).toBeGreaterThan(weakFactors.market.confidence);
  });

  it("penalises a factor whose cross-validating questions disagree", () => {
    const live = pick({}, "stage_state", "live_free");
    const consistent = pick(pick(live, "usage_pattern", "daily"), "repeat_share", "most");
    const conflicting = pick(pick(live, "usage_pattern", "one_off"), "repeat_share", "most");
    const a = scoreFactors(consistent).traction;
    const b = scoreFactors(conflicting).traction;
    expect(b.consistency).toBeLessThan(a.consistency);
    expect(b.confidence).toBeLessThan(a.confidence);
  });

  it("never reports certainty, however good the evidence", () => {
    const result = evaluate(maximise(pick({}, "stage_state", "paying")));
    for (const factor of result.factors) {
      expect(factor.confidence).toBeLessThanOrEqual(CONFIDENCE_CEILING);
    }
  });

  it("treats an unassessed factor as neutral with zero confidence", () => {
    const factors = scoreFactors({});
    expect(factors.team.raw).toBe(50);
    expect(factors.team.confidence).toBe(0);
    expect(factors.team.coverage).toBe(0);
  });
});

/* ── Contradictions ───────────────────────────────────────────────────── */

describe("contradiction detection", () => {
  it("catches more 30-day users than all-time users", () => {
    let answers = pick({}, "stage_state", "live_free");
    answers = enter(answers, "users_total", 50);
    answers = enter(answers, "users_active", 1000);
    const found = detectContradictions(answers);
    expect(found.map((c) => c.ruleId)).toContain("active_exceeds_total");
    expect(found[0].severity).toBe("high");
    expect(found[0].message).toContain("1,000");
  });

  it("catches strong claimed retention against a one-off usage pattern", () => {
    let answers = pick({}, "stage_state", "live_free");
    answers = pick(answers, "repeat_share", "most");
    answers = pick(answers, "usage_pattern", "one_off");
    expect(detectContradictions(answers).map((c) => c.ruleId)).toContain("retention_vs_pattern");
  });

  it("catches a billion-dollar market sized by personal estimate", () => {
    let answers = pick({}, "market_basis", "estimate");
    answers = enter(answers, "market_sam", 4_000_000_000);
    expect(detectContradictions(answers).map((c) => c.ruleId)).toContain("large_market_weak_basis");
  });

  it("catches full-time commitment claimed with no full-time founders", () => {
    let answers = pick({}, "team_commitment", "left_jobs");
    answers = enter(answers, "team_fulltime", 0);
    expect(detectContradictions(answers).map((c) => c.ruleId)).toContain("commitment_vs_fulltime");
  });

  it("stays quiet when the story is consistent", () => {
    let answers = pick({}, "stage_state", "live_free");
    answers = enter(answers, "users_total", 1000);
    answers = enter(answers, "users_active", 300);
    answers = pick(answers, "usage_pattern", "weekly");
    answers = pick(answers, "repeat_share", "about_half");
    expect(detectContradictions(answers)).toHaveLength(0);
  });

  it("cuts factor confidence while a contradiction stands, and restores it on correction", () => {
    let answers = pick({}, "stage_state", "live_free");
    answers = enter(answers, "users_total", 50);
    answers = enter(answers, "users_active", 1000);
    const found = detectContradictions(answers);
    const open = scoreFactors(answers, found).traction.confidence;
    const corrected = scoreFactors(answers, found, {
      active_exceeds_total: { ruleId: "active_exceeds_total", outcome: "corrected", resolvedAt: at },
    }).traction.confidence;
    const explained = scoreFactors(answers, found, {
      active_exceeds_total: { ruleId: "active_exceeds_total", outcome: "explained", resolvedAt: at },
    }).traction.confidence;
    expect(open).toBeLessThan(explained);
    expect(explained).toBeLessThan(corrected);
  });
});

/* ── Methodologies ────────────────────────────────────────────────────── */

describe("methodologies", () => {
  it("declares a stage range and a run function for every entry", () => {
    for (const methodology of METHODOLOGIES) {
      expect(methodology.stages.length).toBeGreaterThan(0);
      expect(methodology.limitations.length).toBeGreaterThan(0);
      expect(typeof methodology.run).toBe("function");
      expect(methodology.baseConfidence).toBeLessThanOrEqual(1);
    }
  });

  it("does not run Berkus on a company with revenue, and says why", () => {
    const answers = maximise(pick({}, "stage_state", "paying"));
    const berkus = evaluate(answers).methodologies.find((m) => m.id === "berkus")!;
    expect(berkus.status).toBe("not_applicable");
    expect(berkus.reason).toBeTruthy();
    expect(berkus.range).toBeUndefined();
  });

  it("does not run revenue methods on a pre-revenue company", () => {
    const answers = maximise(pick({}, "stage_state", "concept"));
    const result = evaluate(answers);
    for (const id of ["revenue_multiple", "vc_method"]) {
      const outcome = result.methodologies.find((m) => m.id === id)!;
      expect(outcome.status).not.toBe("computed");
      expect(outcome.reason).toBeTruthy();
    }
    expect(result.methodologies.find((m) => m.id === "berkus")!.status).toBe("computed");
  });

  it("returns an ordered range for every method that ran", () => {
    const result = evaluate(maximise(pick({}, "stage_state", "paying")));
    const computed = result.methodologies.filter((m) => m.status === "computed");
    expect(computed.length).toBeGreaterThan(1);
    for (const outcome of computed) {
      expect(outcome.range!.low).toBeLessThanOrEqual(outcome.range!.point);
      expect(outcome.range!.point).toBeLessThanOrEqual(outcome.range!.high);
      expect(outcome.components.length).toBeGreaterThan(0);
      for (const component of outcome.components) {
        expect(component.rationale.length).toBeGreaterThan(10);
      }
    }
  });

  it("widens the range as confidence falls", () => {
    const confident = spreadFrom(1_000_000, 1);
    const unsure = spreadFrom(1_000_000, 0);
    expect(confident.high - confident.low).toBeLessThan(unsure.high - unsure.low);
  });

  it("refuses false precision", () => {
    expect(roundSensible(2_173_492)).toBe(2_200_000);
    expect(roundSensible(0)).toBe(0);
  });
});

/* ── End to end ───────────────────────────────────────────────────────── */

describe("evaluate", () => {
  it("blends the methods that ran into one weighted range", () => {
    const result = evaluate(maximise(pick({}, "stage_state", "paying")));
    expect(result.valuation.low).toBeLessThanOrEqual(result.valuation.point);
    expect(result.valuation.point).toBeLessThanOrEqual(result.valuation.high);
    const total = result.blend.weights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBeGreaterThan(0.9);
    expect(total).toBeLessThan(1.1);
    expect(result.blend.excluded.length).toBeGreaterThan(0);
  });

  it("keeps a valuation provisional while a high-severity contradiction stands", () => {
    let answers = maximise(pick({}, "stage_state", "live_free"));
    answers = enter(answers, "users_total", 50);
    answers = enter(answers, "users_active", 5000);
    const result = evaluate(answers);
    expect(result.provisional).toBe(true);
    expect(result.contradictions.some((c) => c.severity === "high")).toBe(true);

    const resolutions = Object.fromEntries(
      result.contradictions.map((contradiction) => [
        contradiction.ruleId,
        { ruleId: contradiction.ruleId, outcome: "corrected" as const, resolvedAt: at },
      ]),
    );
    const resolved = evaluate(answers, resolutions);
    expect(resolved.provisional).toBe(false);
    expect(resolved.confidence).toBeGreaterThan(result.confidence);
  });

  it("shrinks every score it reports, and never claims full confidence", () => {
    const result = evaluate(maximise(pick({}, "stage_state", "paying")));
    expect(result.rawScore).toBeGreaterThan(80);
    // Even a flawless set of answers is a set of answers: nothing here has
    // been independently verified, so the reported score sits below the raw
    // reading and confidence stays short of certainty.
    expect(result.overallScore).toBeLessThanOrEqual(result.rawScore);
    expect(result.confidence).toBeLessThan(0.9);
    expect(result.valuation.high).toBeGreaterThan(result.valuation.low);
  });

  it("catches a maximised profile the moment one figure stops adding up", () => {
    let answers = maximise(pick({}, "stage_state", "live_free"));
    answers = enter(answers, "users_total", 50);
    const result = evaluate(answers);
    expect(result.contradictions.length).toBeGreaterThan(0);
    expect(result.provisional).toBe(true);
    const clean = evaluate(maximise(pick({}, "stage_state", "live_free")));
    expect(result.confidence).toBeLessThan(clean.confidence);
  });

  it("discounts the same claims when they rest on weaker evidence", () => {
    const strong = maximise(pick({}, "stage_state", "paying"));
    let weak = { ...strong };
    weak = pick(weak, "market_basis", "estimate");
    weak = pick(weak, "retention_measure", "estimate");
    weak = pick(weak, "revenue_evidence", "informal");
    weak = pick(weak, "books", "none");

    const strongResult = evaluate(strong);
    const weakResult = evaluate(weak);
    expect(weakResult.evidenceQuality).toBeLessThan(strongResult.evidenceQuality);
    expect(weakResult.confidence).toBeLessThan(strongResult.confidence);
    // Relative width, not absolute: weaker evidence lowers the point estimate
    // as well as widening the band around it.
    const width = (r: typeof weakResult) => (r.valuation.high - r.valuation.low) / r.valuation.point;
    expect(width(weakResult)).toBeGreaterThan(width(strongResult));
  });

  it("explains every score it shows", () => {
    const result = evaluate(maximise(pick({}, "stage_state", "live_free")));
    for (const factor of result.factors) {
      if (factor.coverage === 0) continue;
      expect(factor.contributions.length).toBeGreaterThan(0);
      for (const contribution of factor.contributions) {
        expect(contribution.answerLabel.length).toBeGreaterThan(0);
        expect(QUESTION_BY_ID[contribution.questionId]).toBeDefined();
      }
    }
  });

  it("lists the unanswered questions that would firm the result up", () => {
    const answers = pick({}, "stage_state", "live_free");
    const result = evaluate(answers);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps[0].value).toBeGreaterThanOrEqual(result.gaps[result.gaps.length - 1].value);
    expect(result.coverage).toBeLessThan(0.2);
  });

  it("reads the stage off the answers", () => {
    expect(stageFromSignals(collectSignals(pick({}, "stage_state", "scaling")))).toBe("scaling");
    expect(stageFromSignals({})).toBe("idea");
  });

  it("refuses to value a session that has barely started", () => {
    const result = evaluate({});
    expect(result.overallScore).toBe(50);
    expect(result.confidence).toBe(0);
    expect(result.valuation.point).toBe(0);
    expect(result.methodologies.length).toBe(METHODOLOGIES.length);
    // Neutral defaults would otherwise compound into a confident-looking
    // number built out of questions nobody has answered.
    for (const outcome of result.methodologies) {
      expect(outcome.status).toBe("insufficient_input");
      expect(outcome.reason).toContain("interview");
    }
  });
});

/* ── The bridge to the autonomous analyst ─────────────────────────────── */

describe("analyst bridge", () => {
  const sessionFrom = (answers: AnswerMap, resolutions = {}) => ({
    id: "sess_test",
    startupName: "Northwind",
    answers,
    resolutions,
    history: Object.keys(answers),
    startedAt: at,
    updatedAt: at,
    completedAt: null,
  });

  const revenueStage = maximise(pick({}, "stage_state", "paying"));

  it("hands back nothing when there is no interview to hand over", () => {
    expect(toAnalystInputs(sessionFrom({}))).toBeNull();
  });

  it("supplies the comparables median the Scorecard agent was missing", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.manual.scorecardMedian).toBeGreaterThan(0);
    expect(inputs.manual.scorecardAnswers).toHaveLength(7);
    for (const percentage of inputs.manual.scorecardAnswers) {
      expect(SCORECARD_SCORE_VALUES).toContain(percentage);
    }
  });

  it("supplies the risk grid on the method's own -2..+2 scale", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.manual.riskAnswers).toHaveLength(12);
    for (const step of inputs.manual.riskAnswers) {
      expect(RISK_SCORE_VALUES).toContain(step);
    }
  });

  it("supplies the exit-year revenue the VC and First Chicago agents were missing", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.manual.vcAnswers!.revenue).toBeGreaterThan(0);
    expect(inputs.manual.vcAnswers!.exitYears).toBeGreaterThan(0);
    expect(inputs.manual.vcAnswers!.requiredIRR).toBeGreaterThan(0);

    const chicago = inputs.manual.chicagoAnswers!;
    expect(chicago.revenue).toBe(inputs.manual.vcAnswers!.revenue);
    const total = chicago.probabilities.worst + chicago.probabilities.base + chicago.probabilities.best;
    expect(total).toBe(100);
  });

  it("passes on the same grid positions the results page rendered", () => {
    // The whole point of the bridge is that the agents and the dashboard are
    // reading one computation. A pre-revenue company runs Berkus, so use one.
    const preRevenue = maximise(pick({}, "stage_state", "prototype"));
    const inputs = toAnalystInputs(sessionFrom(preRevenue))!;
    const berkus = evaluate(preRevenue).methodologies.find((m) => m.id === "berkus")!;

    expect(inputs.manual.berkusAnswers).toHaveLength(5);
    const fromGrid = computeBerkus(inputs.manual.berkusAnswers);
    expect(fromGrid).toBe(berkus.components.reduce((sum, c) => sum + (c.contribution ?? 0), 0));
  });

  it("leaves a methodology's slot empty when the assessment did not run it", () => {
    // Berkus is gated out at revenue stage, so the workflow keeps whatever the
    // manual calculator holds rather than being handed a fabricated grid.
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.manual.berkusAnswers).toHaveLength(0);
  });

  it("writes the interview out for the agents, evidence tags and all", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.narrative).toContain("STRUCTURED ASSESSMENT INTERVIEW");
    expect(inputs.narrative).toContain("What has the founding team actually completed in the last 12 months?");
    expect(inputs.narrative).toMatch(/\[(Verified|Documented|Self-reported|Estimated)\]/);
    // The agents must reach their own valuation; handing them ours would turn
    // two independent readings into one number asserted twice.
    expect(inputs.narrative).not.toMatch(/blended|estimated valuation/i);
  });

  it("carries unresolved inconsistencies over rather than hiding them", () => {
    let conflicted = { ...revenueStage };
    conflicted = enter(conflicted, "users_total", 40);
    conflicted = enter(conflicted, "users_active", 9000);
    const inputs = toAnalystInputs(sessionFrom(conflicted))!;

    const keys = Object.keys(inputs.gapAnswers);
    expect(keys.some((key) => key.startsWith("inconsistency:"))).toBe(true);
    expect(Object.values(inputs.gapAnswers).join(" ")).toContain("Unresolved");
    expect(inputs.narrative).toContain("Inconsistencies the assessment found");
  });

  it("states the comparable anchor the Scorecard and Risk Factor agents refuse to run without", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.narrative).toContain("Reference anchors");
    expect(inputs.narrative).toContain("Comparable median pre-money for this sector and stage: $");
    expect(inputs.narrative).toContain("Primary market:");
    expect(inputs.financialSnapshot!.comparableMedianPreMoneyUsd).toBe(inputs.manual.scorecardMedian);
  });

  it("writes banded answers out in words the agents can read", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(typeof inputs.financialSnapshot!.sixMonthRetention).toBe("string");
    expect(String(inputs.financialSnapshot!.grossMarginBand)).toMatch(/%/);
  });

  it("reports the figures the founder gave, flagged as unreconciled", () => {
    const inputs = toAnalystInputs(sessionFrom(revenueStage))!;
    expect(inputs.financialSnapshot).not.toBeNull();
    expect(inputs.financialSnapshot!.monthlyRevenueUsd).toBeGreaterThan(0);
    expect(String(inputs.financialSnapshot!.note)).toMatch(/not reconciled/i);
  });
});
