// The bridge from the assessment to the autonomous analyst.
//
// The workflow agents were declining half the valuation methodologies for a
// simple reason: nobody had given them the inputs. Scorecard refused because
// the comparables median was zero, VC Method and First Chicago because there
// was no revenue projection, Risk Factor because it had no base valuation —
// all of which the assessment already derives.
//
// So this module hands the analyst what the interview produced: the founder's
// own answers as a transcript, the derived factor scores, and each published
// methodology's native inputs — Berkus grid positions, Scorecard comparison
// percentages, Risk Factor steps — taken from the same computation the
// results page renders, never re-derived here.
//
// What it deliberately does not do is hand over the assessment's valuation.
// The agents must reach their own number; the point of running both is that
// they can disagree, and a disagreement between two independent readings is
// worth more than one number asserted twice.

import type { VCAnswers } from "@/lib/analyst/methodologies/vcMethod";
import type { ChicagoAnswers } from "@/lib/analyst/methodologies/firstChicago";

import { QUESTIONS, SECTION_BY_KEY, STAGE_BY_KEY } from "./index";
import { collectSignals, scoreAnswer } from "./engine";
import { evaluate } from "./valuation";
import { comparableMedian } from "./config/methodologies";
import {
  EVIDENCE_LABEL,
  type AnswerMap,
  type AssessmentResult,
  type AssessmentSession,
  type MethodologyOutcome,
  type SignalState,
} from "./types";

/** What the workflow's `buildInputBundle` can consume directly. */
export interface AnalystInputs {
  startupName: string;
  /** The interview, written out for the agents to read. */
  narrative: string;
  manual: {
    berkusAnswers: (number | null)[];
    scorecardAnswers: (number | null)[];
    scorecardMedian: number;
    riskAnswers: (number | null)[];
    vcAnswers: VCAnswers | null;
    chicagoAnswers: ChicagoAnswers | null;
  };
  /** Flat and labelled, rather than a half-filled accounting shape. */
  financialSnapshot: Record<string, unknown> | null;
  /** Anything the founder still owes an answer on, put to the agents too. */
  gapAnswers: Record<string, string>;
}

/** Banded answers, written out. An agent cannot interpret "band 3". */
const retentionWord = (band: number | null): string | null =>
  band === null || band < 0
    ? null
    : ["few of them", "few of them", "about half", "most of them", "all of them, several expanded"][band] ?? null;

const marginWord = (band: number | null): string | null =>
  band === null || band <= 0
    ? null
    : ["", "under 25%", "25-50%", "50-75%", "over 75%"][band] ?? null;

const num = (signals: SignalState, key: string): number | null => {
  const value = signals[key];
  return typeof value === "number" && isFinite(value) ? value : null;
};

/** Pull one methodology's native component values, in declaration order. */
function nativeValues(outcome: MethodologyOutcome | undefined, expected: number): (number | null)[] {
  if (!outcome || outcome.status !== "computed") return [];
  const values = outcome.components
    .filter((component) => component.raw !== undefined)
    .map((component) => component.raw as number);
  return values.length === expected ? values : [];
}

const rawOf = (outcome: MethodologyOutcome | undefined, key: string): number | null => {
  const component = outcome?.components.find((entry) => entry.key === key);
  return component?.raw ?? null;
};

/* ── The transcript ───────────────────────────────────────────────────── */

/**
 * The interview as prose. Grouped by section, each answer tagged with how it
 * was evidenced, so an agent weighing a claim can see whether it came off a
 * bank statement or out of memory.
 *
 * The anchor block at the end exists because the Scorecard and Risk Factor
 * agents both decline without a comparable base, and neither can see the
 * sector table this assessment uses. Stating it — with its provenance, so it
 * is weighed as a convention and not as a market observation — is what lets
 * them run at all.
 */
function transcript(answers: AnswerMap, result: AssessmentResult, median: number): string {
  const signals = collectSignals(answers);
  const stage = STAGE_BY_KEY[result.stage];
  const lines: string[] = [];

  lines.push(`STRUCTURED ASSESSMENT INTERVIEW`);
  lines.push(
    `Stage: ${stage?.label ?? result.stage} — ${stage?.description ?? ""}`.trim(),
  );
  if (typeof signals.sector === "string") lines.push(`Sector: ${signals.sector}`);
  if (typeof signals.geography === "string") lines.push(`Primary market: ${signals.geography}`);
  lines.push(
    `${Object.keys(answers).length} questions answered, covering ${Math.round(result.coverage * 100)}% of ` +
      `what applies at this stage. Weighted evidence quality ${Math.round(result.evidenceQuality * 100)}%.`,
  );
  lines.push(
    `Answers below are the founder's own, in their own words. The bracketed tag on each is how that answer ` +
      `is evidenced, not a judgement of whether it is true.`,
  );

  const sections = [...new Set(QUESTIONS.map((question) => question.section))].sort(
    (a, b) => (SECTION_BY_KEY[a]?.order ?? 0) - (SECTION_BY_KEY[b]?.order ?? 0),
  );

  for (const section of sections) {
    const asked = QUESTIONS.filter(
      (question) => question.section === section && answers[question.id],
    );
    if (!asked.length) continue;

    lines.push("", `## ${SECTION_BY_KEY[section]?.label ?? section}`);
    for (const question of asked) {
      const scored = scoreAnswer(question, answers[question.id]);
      if (!scored) continue;
      lines.push(`Q: ${question.prompt}`);
      lines.push(`A: ${scored.label} [${EVIDENCE_LABEL[scored.evidence]}]`);
    }
  }

  lines.push("", "## Scores derived by the assessment engine, not stated by the founder");
  lines.push(
    "Each is 0-100 after a confidence haircut, with the confidence that survived the evidence behind it.",
  );
  for (const factor of result.factors) {
    if (factor.coverage <= 0) continue;
    lines.push(
      `${factor.label}: ${factor.adjusted}/100 (raw ${factor.raw}, confidence ${Math.round(factor.confidence * 100)}%, ` +
        `evidence ${Math.round(factor.evidenceQuality * 100)}%)`,
    );
  }

  lines.push("", "## Reference anchors available to the valuation methodologies");
  lines.push(
    `Comparable median pre-money for this sector and stage: $${Math.round(median).toLocaleString("en-US")}. ` +
      `This is a published sector convention adjusted for stage, not a verified local comparable — use it as the ` +
      `Scorecard anchor and the Risk Factor base, and say so in your assumptions.`,
  );
  const acv = num(signals, "acv_usd");
  const cac = num(signals, "cac_usd");
  if (acv !== null && cac !== null && cac > 0) {
    lines.push(
      `Founder-reported annual contract value $${acv.toLocaleString("en-US")} against an acquisition cost of ` +
        `$${cac.toLocaleString("en-US")} per customer — a first-year ratio of ${(acv / cac).toFixed(1)}×.`,
    );
  }

  if (result.contradictions.length) {
    lines.push("", "## Inconsistencies the assessment found in these answers");
    lines.push("Treat any figure named here as unsettled until the founder resolves it.");
    for (const contradiction of result.contradictions) {
      lines.push(`- [${contradiction.severity}] ${contradiction.title}: ${contradiction.message}`);
    }
  }

  return lines.join("\n");
}

/* ── The bridge ───────────────────────────────────────────────────────── */

export function toAnalystInputs(session: AssessmentSession): AnalystInputs | null {
  const answers = session.answers ?? {};
  if (!Object.keys(answers).length) return null;

  const result = evaluate(answers, session.resolutions ?? {});
  const signals = collectSignals(answers);

  const byId = (id: string) => result.methodologies.find((outcome) => outcome.id === id);
  const berkus = byId("berkus");
  const scorecard = byId("scorecard");
  const riskFactor = byId("risk_factor");
  const vc = byId("vc_method");

  const median = comparableMedian(
    typeof signals.sector === "string" ? signals.sector : undefined,
    result.stage,
  );

  // The VC and First Chicago agents need an exit-year revenue to work back
  // from. The assessment already projects one, with growth decayed rather
  // than compounded flat; reuse it rather than inventing a second projection.
  const exitRevenue = rawOf(vc, "exit_revenue");
  const exitMultiple = rawOf(vc, "exit_value");
  const requiredIRR = rawOf(vc, "discount");
  const exitYears = rawOf(vc, "pre_money");
  const raise = num(signals, "raise_usd") ?? 0;

  const vcAnswers: VCAnswers | null =
    exitRevenue && exitMultiple && requiredIRR && exitYears
      ? {
          revenue: exitRevenue,
          netIncomeMargin: 20,
          exitMultiple,
          customMultiple: exitMultiple,
          isOther: false,
          exitYears,
          requiredIRR,
          investmentAmount: raise,
        }
      : null;

  const chicagoAnswers: ChicagoAnswers | null =
    exitRevenue && exitMultiple && exitYears
      ? {
          revenue: exitRevenue,
          exitMultiple,
          customMultiple: exitMultiple,
          isOther: false,
          yearsToExit: exitYears,
          discountRates: { worst: 60, base: requiredIRR ?? 40, best: 30 },
          // Weighted toward the base case, then tilted by how much of this
          // company's story is actually evidenced. The best case takes the
          // remainder so the three always total 100 exactly.
          probabilities: (() => {
            const base = 55;
            const worst = Math.round(30 - result.confidence * 10);
            return { worst, base, best: 100 - base - worst };
          })(),
        }
      : null;

  const mrr = num(signals, "mrr_usd");
  const burn = num(signals, "burn_usd");
  const runway = num(signals, "runway_months");
  const customers = num(signals, "paying_customers");
  const activeUsers = num(signals, "users_active");

  const financialSnapshot =
    mrr !== null || burn !== null || runway !== null
      ? {
          source: "structured assessment interview",
          monthlyRevenueUsd: mrr,
          monthlyBurnUsd: burn,
          runwayMonths: runway,
          payingCustomers: customers,
          activeUsers30d: activeUsers,
          annualContractValueUsd: num(signals, "acv_usd"),
          customerAcquisitionCostUsd: num(signals, "cac_usd"),
          sixMonthRetention: retentionWord(num(signals, "retention_band")),
          grossMarginBand: marginWord(num(signals, "gross_margin_band")),
          geography: typeof signals.geography === "string" ? signals.geography : null,
          comparableMedianPreMoneyUsd: Math.round(median),
          raiseSoughtUsd: raise || null,
          revenueVerifiable: signals.revenue_verifiable === true,
          note:
            "Founder-reported through a structured interview. Not reconciled against bank records or a P&L.",
        }
      : null;

  const gapAnswers: Record<string, string> = {};
  for (const contradiction of result.contradictions) {
    const resolution = session.resolutions?.[contradiction.ruleId];
    gapAnswers[`inconsistency:${contradiction.ruleId}`] = resolution
      ? `${contradiction.message} Founder response (${resolution.outcome}): ${resolution.note ?? "answer corrected"}`
      : `${contradiction.message} Unresolved at the time of this run.`;
  }

  return {
    startupName: session.startupName,
    narrative: transcript(answers, result, median),
    manual: {
      berkusAnswers: nativeValues(berkus, 5),
      scorecardAnswers: nativeValues(scorecard, 7),
      scorecardMedian: Math.round(median),
      riskAnswers: nativeValues(riskFactor, 12),
      vcAnswers,
      chicagoAnswers,
    },
    financialSnapshot,
    gapAnswers,
  };
}

/** Read the saved interview straight from storage, for pages that have no hook. */
export function loadAssessmentSession(storageKey = "investvcs.assessment.v1"): AssessmentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentSession;
    return parsed?.answers && Object.keys(parsed.answers).length ? parsed : null;
  } catch {
    return null;
  }
}
