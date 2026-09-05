// Methodology configuration.
//
// Each entry is data plus one pure function. Adding First Chicago, a
// checklist method or comparable transactions means appending an entry — the
// engine, the blending and the whole results surface pick it up without
// changing.
//
// The published formulas themselves are imported from `lib/analyst/
// methodologies`, which the manual calculators and the Python analyst service
// also use, so a Berkus number computed here can never disagree with a Berkus
// number computed there for the same grid positions.

import {
  BERKUS_SCORE_TO_VALUE,
  computeBerkus,
} from "@/lib/analyst/methodologies/berkus";
import {
  SCORECARD_WEIGHTS,
  computeScorecard,
  computeScorecardWeight,
  snapScorecardScore,
} from "@/lib/analyst/methodologies/scorecard";
import {
  RISK_ADJUSTMENT_PER_POINT,
  RISK_KEYS,
  computeRiskFactor,
} from "@/lib/analyst/methodologies/riskFactor";
import { computeVCBreakdown } from "@/lib/analyst/methodologies/vcMethod";

import type {
  FactorKey,
  MethodologyComponent,
  MethodologyConfig,
  StageKey,
  ValuationContext,
  ValuationRange,
} from "../types";
import { stageRank } from "./factors";

/* ── Market anchors ───────────────────────────────────────────────────── */

/**
 * Median pre-money for a funded company in this sector, before any
 * company-specific adjustment. These are the Scorecard family's anchor and
 * the single most consequential assumption in the whole model — they are
 * declared here, in one place, so they can be argued with.
 */
export const SECTOR_MEDIAN_PREMONEY: Record<string, number> = {
  saas_b2b: 3_500_000,
  consumer: 3_000_000,
  marketplace: 3_200_000,
  ecommerce: 2_000_000,
  deeptech: 4_000_000,
  fintech: 3_800_000,
  services: 1_800_000,
  default: 3_000_000,
};

export const STAGE_MULTIPLIER: Record<StageKey, number> = {
  idea: 0.35,
  prototype: 0.55,
  mvp: 0.8,
  revenue: 1.15,
  scaling: 1.8,
};

/** Revenue multiples applied to run-rate ARR, by sector. */
export const SECTOR_REVENUE_MULTIPLE: Record<string, number> = {
  saas_b2b: 8,
  consumer: 4,
  marketplace: 5,
  ecommerce: 2,
  deeptech: 10,
  fintech: 7,
  services: 2,
  default: 5,
};

export function comparableMedian(sector: string | undefined, stage: StageKey): number {
  const base = SECTOR_MEDIAN_PREMONEY[sector ?? "default"] ?? SECTOR_MEDIAN_PREMONEY.default;
  return base * (STAGE_MULTIPLIER[stage] ?? 1);
}

/* ── Shared helpers ───────────────────────────────────────────────────── */

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Two significant figures. Precision the evidence cannot support is noise. */
export function roundSensible(value: number): number {
  if (!isFinite(value) || value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}

/**
 * A point estimate becomes a range by widening with uncertainty. At
 * confidence 1 the band is ±15%; at confidence 0 it runs from roughly half to
 * nearly double.
 */
export function spreadFrom(point: number, confidence: number): ValuationRange {
  const uncertainty = 1 - clamp01(confidence);
  return {
    low: roundSensible(point * (1 - (0.15 + 0.35 * uncertainty))),
    point: roundSensible(point),
    high: roundSensible(point * (1 + (0.15 + 0.55 * uncertainty))),
  };
}

type FactorMix = { factor: FactorKey; weight: number }[];

/** Blend derived factors into one 0..1 component score. */
function mix(ctx: ValuationContext, parts: FactorMix): number {
  const total = parts.reduce((sum, p) => sum + p.weight, 0) || 1;
  const value = parts.reduce(
    (sum, p) => sum + (ctx.factors[p.factor]?.adjusted ?? 50) * p.weight,
    0,
  );
  return clamp01(value / total / 100);
}

/** Mean confidence of the factors a component leans on. */
function mixConfidence(ctx: ValuationContext, parts: FactorMix): number {
  const total = parts.reduce((sum, p) => sum + p.weight, 0) || 1;
  return clamp01(
    parts.reduce((sum, p) => sum + (ctx.factors[p.factor]?.confidence ?? 0) * p.weight, 0) / total,
  );
}

const factorNames = (ctx: ValuationContext, parts: FactorMix): string =>
  parts.map((p) => ctx.factors[p.factor]?.label ?? p.factor).join(" and ");

/**
 * Money in prose. Rounded to two significant figures and written compactly,
 * because "$5.2M" is what the evidence supports and "$5,192,250" is a lie
 * told with a comma.
 */
const usd = (value: number): string => {
  const rounded = roundSensible(value);
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) return `$${(rounded / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(rounded / 1_000)}k`;
  return `$${Math.round(rounded)}`;
};

const num = (ctx: ValuationContext, key: string): number => {
  const value = ctx.signals[key];
  return typeof value === "number" && isFinite(value) ? value : 0;
};

const bandWord = (score: number): string =>
  score >= 0.8 ? "very strong"
    : score >= 0.62 ? "strong"
      : score >= 0.45 ? "moderate"
        : score >= 0.28 ? "weak"
          : "very weak";

/* ── Berkus ───────────────────────────────────────────────────────────── */

const BERKUS_COMPONENTS: { key: string; label: string; from: FactorMix; asks: string }[] = [
  {
    key: "sound_idea",
    label: "Sound idea",
    from: [{ factor: "market", weight: 0.6 }, { factor: "product", weight: 0.4 }],
    asks: "Is there a real problem, sized from something other than optimism?",
  },
  {
    key: "prototype",
    label: "Prototype",
    from: [{ factor: "product", weight: 0.55 }, { factor: "technology", weight: 0.45 }],
    asks: "Does the thing exist, and does it work outside a demo?",
  },
  {
    key: "team",
    label: "Quality management team",
    from: [{ factor: "team", weight: 1 }],
    asks: "Can these specific people execute this specific plan?",
  },
  {
    key: "strategic",
    label: "Strategic relationships",
    from: [{ factor: "relationships", weight: 0.7 }, { factor: "gtm", weight: 0.3 }],
    asks: "Has anyone outside the company put their name to it?",
  },
  {
    key: "rollout",
    label: "Product rollout / sales",
    from: [{ factor: "traction", weight: 0.7 }, { factor: "gtm", weight: 0.3 }],
    asks: "Has demand been demonstrated rather than described?",
  },
];

const berkus: MethodologyConfig = {
  id: "berkus",
  name: "Berkus Method",
  purpose: "Prices the de-risking that has actually happened, not the projections.",
  explanation:
    "Five things reduce the risk of an early company failing. Each is worth up to $500,000, and nothing is credited for a forecast. Your answers place each component on a six-step scale; the scale sets the dollars.",
  baseConfidence: 0.7,
  stages: ["idea", "prototype", "mvp"],
  limitations: [
    "Caps at $2.5M by construction, so it says nothing useful once a company has meaningful revenue.",
    "The $500k per component is a convention, not a market observation.",
  ],
  gate: (ctx) =>
    stageRank(ctx.stage) > 2
      ? "The company has revenue. Berkus is built for pre-revenue companies and its $2.5M ceiling would understate this one."
      : null,
  run: (ctx) => {
    const grid: number[] = [];
    const components: MethodologyComponent[] = BERKUS_COMPONENTS.map((component) => {
      const score = mix(ctx, component.from);
      const position = Math.max(0, Math.min(5, Math.round(score * 5)));
      grid.push(position);
      const value = BERKUS_SCORE_TO_VALUE[position] ?? 0;
      return {
        key: component.key,
        label: component.label,
        score,
        display: usd(value),
        raw: position,
        contribution: value,
        from: component.from.map((p) => p.factor),
        rationale: `${component.asks} Your answers put ${factorNames(ctx, component.from)} at ${bandWord(score)}, which lands this component at step ${position} of 5 — ${usd(value)}.`,
      };
    });

    const total = computeBerkus(grid);
    const confidence = clamp01(
      berkus.baseConfidence *
        (0.45 + 0.55 * mixConfidence(ctx, BERKUS_COMPONENTS.flatMap((c) => c.from))),
    );

    return {
      range: spreadFrom(total, confidence),
      confidence,
      components,
      assumptions: [
        "Each de-risking component is worth up to $500,000, per the published method.",
        "Components are scored from your answers, not from a monetary figure you supplied.",
      ],
      limitations: berkus.limitations,
      headline: `Five risk components price out at ${usd(total)} before any market comparison.`,
    };
  },
};

/* ── Scorecard ────────────────────────────────────────────────────────── */

const SCORECARD_COMPONENTS: { key: string; label: string; from: FactorMix }[] = [
  { key: "team", label: "Management team", from: [{ factor: "team", weight: 1 }] },
  { key: "market", label: "Size of opportunity", from: [{ factor: "market", weight: 1 }] },
  {
    key: "product",
    label: "Product / technology",
    from: [{ factor: "product", weight: 0.6 }, { factor: "technology", weight: 0.4 }],
  },
  { key: "competitive", label: "Competitive environment", from: [{ factor: "competition", weight: 1 }] },
  {
    key: "sales",
    label: "Marketing / sales channels",
    from: [{ factor: "gtm", weight: 0.65 }, { factor: "traction", weight: 0.35 }],
  },
  { key: "financing", label: "Need for additional investment", from: [{ factor: "financial", weight: 1 }] },
  {
    key: "other",
    label: "Other factors",
    from: [{ factor: "relationships", weight: 0.5 }, { factor: "traction", weight: 0.5 }],
  },
];

/** 0..1 component score onto the method's 60–150% comparison grid. */
const toComparisonPct = (score: number): number => snapScorecardScore(60 + score * 90);

const scorecard: MethodologyConfig = {
  id: "scorecard",
  name: "Scorecard Method",
  purpose: "Anchors the valuation to what comparable companies actually raise at.",
  explanation:
    "Start from what a median funded company in your sector and stage is worth, then ask whether this company is above or below that median on seven weighted factors. The weights are the published Payne weights; your answers set the comparisons.",
  baseConfidence: 0.75,
  stages: ["prototype", "mvp", "revenue"],
  limitations: [
    "Only as good as the median it starts from; that median is a sector average, not your city's.",
    "Weights are fixed by the published method and do not adapt to an unusual business.",
  ],
  run: (ctx) => {
    const percentages: number[] = [];
    const components: MethodologyComponent[] = SCORECARD_COMPONENTS.map((component, index) => {
      const score = mix(ctx, component.from);
      const pct = toComparisonPct(score);
      percentages.push(pct);
      const weight = SCORECARD_WEIGHTS[index];
      const contribution = (pct / 100) * weight;
      return {
        key: component.key,
        label: component.label,
        score,
        display: `${pct}% of median`,
        raw: pct,
        contribution,
        weight,
        from: component.from.map((p) => p.factor),
        rationale: `${factorNames(ctx, component.from)} scored ${bandWord(score)}, placing this company at ${pct}% of the median company on a factor carrying ${Math.round(weight * 100)}% of the weight. It contributes ${contribution.toFixed(3)} to the multiplier.`,
      };
    });

    const multiplier = computeScorecardWeight(percentages);
    const value = computeScorecard(percentages, ctx.comparableMedian);
    const confidence = clamp01(
      scorecard.baseConfidence *
        (0.4 + 0.6 * mixConfidence(ctx, SCORECARD_COMPONENTS.flatMap((c) => c.from))),
    );

    return {
      range: spreadFrom(value, confidence),
      confidence,
      components,
      assumptions: [
        `Median pre-money for this sector and stage taken as ${usd(ctx.comparableMedian)}.`,
        `Weighted comparison came to ${multiplier.toFixed(2)}× that median.`,
      ],
      limitations: scorecard.limitations,
      headline: `At ${multiplier.toFixed(2)}× a ${usd(ctx.comparableMedian)} median, the Scorecard puts this at ${usd(value)}.`,
    };
  },
};

/* ── Risk Factor Summation ────────────────────────────────────────────── */

const RISK_COMPONENTS: Record<
  (typeof RISK_KEYS)[number],
  { label: string; from: FactorMix; signalPenalty?: (ctx: ValuationContext) => number }
> = {
  management: { label: "Management", from: [{ factor: "team", weight: 1 }] },
  stage: { label: "Stage of business", from: [{ factor: "product", weight: 0.5 }, { factor: "traction", weight: 0.5 }] },
  legislation: {
    label: "Legislation / political",
    from: [{ factor: "market", weight: 1 }],
    signalPenalty: (ctx) => (ctx.signals.regulatory_risk ? 0.3 : ctx.signals.regulatory_pending ? 0.15 : 0),
  },
  supply: {
    label: "Manufacturing / supply",
    from: [{ factor: "technology", weight: 1 }],
    signalPenalty: (ctx) => (ctx.signals.platform_risk_severe ? 0.35 : ctx.signals.platform_risk ? 0.18 : 0),
  },
  sales_marketing: { label: "Sales and marketing", from: [{ factor: "gtm", weight: 1 }] },
  funding: { label: "Funding / capital", from: [{ factor: "financial", weight: 1 }] },
  competition: { label: "Competition", from: [{ factor: "competition", weight: 1 }] },
  technology: { label: "Technology", from: [{ factor: "technology", weight: 1 }] },
  international: { label: "International", from: [{ factor: "market", weight: 0.6 }, { factor: "gtm", weight: 0.4 }] },
  reputation: { label: "Reputation", from: [{ factor: "relationships", weight: 0.6 }, { factor: "traction", weight: 0.4 }] },
  exit: { label: "Exit potential", from: [{ factor: "market", weight: 0.5 }, { factor: "traction", weight: 0.5 }] },
  political: {
    label: "Key person / political",
    from: [{ factor: "team", weight: 1 }],
    signalPenalty: (ctx) => (ctx.signals.key_person_severe ? 0.3 : ctx.signals.key_person_risk ? 0.15 : 0),
  },
};

const riskFactor: MethodologyConfig = {
  id: "risk_factor",
  name: "Risk Factor Summation",
  purpose: "Prices the specific risks of this company rather than its upside.",
  explanation:
    "Take the same market median, then step it up or down by $250,000 for each of twelve risk categories, from very high risk to very low. It is the only method here that reads the downside directly.",
  baseConfidence: 0.62,
  stages: ["idea", "prototype", "mvp", "revenue", "scaling"],
  limitations: [
    "Twelve equal-weighted risks treat regulatory exposure and reputation as equally consequential.",
    "The ±$250k step is a convention that does not scale with company size.",
  ],
  run: (ctx) => {
    const grid: number[] = [];
    const components: MethodologyComponent[] = RISK_KEYS.map((key) => {
      const config = RISK_COMPONENTS[key];
      const penalty = config.signalPenalty?.(ctx) ?? 0;
      const score = clamp01(mix(ctx, config.from) - penalty);
      const position = Math.max(-2, Math.min(2, Math.round((score - 0.5) * 4)));
      grid.push(position);
      const adjustment = position * RISK_ADJUSTMENT_PER_POINT;
      return {
        key,
        label: config.label,
        score,
        display: `${position > 0 ? "+" : ""}${usd(adjustment)}`,
        raw: position,
        contribution: adjustment,
        from: config.from.map((p) => p.factor),
        rationale: `Assessed as ${bandWord(score)} on ${factorNames(ctx, config.from)}${penalty > 0 ? ", with a specific risk flagged in your answers" : ""}. That is grid position ${position > 0 ? "+" : ""}${position}, worth ${position === 0 ? "no adjustment" : `${position > 0 ? "+" : ""}${usd(adjustment)}`}.`,
      };
    });

    const value = computeRiskFactor(grid, ctx.comparableMedian);
    const confidence = clamp01(
      riskFactor.baseConfidence *
        (0.4 + 0.6 * mixConfidence(ctx, Object.values(RISK_COMPONENTS).flatMap((c) => c.from))),
    );
    const net = grid.reduce((sum, position) => sum + position, 0);

    return {
      range: spreadFrom(value, confidence),
      confidence,
      components,
      assumptions: [
        `Base valuation of ${usd(ctx.comparableMedian)}, the same sector median the Scorecard uses.`,
        `Twelve risk categories net to ${net > 0 ? "+" : ""}${net} steps, or ${net > 0 ? "+" : ""}${usd(net * RISK_ADJUSTMENT_PER_POINT)}.`,
      ],
      limitations: riskFactor.limitations,
      headline: `Risk adjustments net ${net > 0 ? "+" : ""}${usd(net * RISK_ADJUSTMENT_PER_POINT)} against a ${usd(ctx.comparableMedian)} base.`,
    };
  },
};

/* ── Revenue multiple ─────────────────────────────────────────────────── */

const revenueMultiple: MethodologyConfig = {
  id: "revenue_multiple",
  name: "Revenue Multiple",
  purpose: "Values the company the way an acquirer's first pass would: a multiple of run-rate revenue.",
  explanation:
    "Annualise last month's collected revenue, apply the multiple your sector trades at, then adjust for growth, retention and margin — the three things that decide whether a multiple is deserved.",
  baseConfidence: 0.7,
  stages: ["revenue", "scaling"],
  limitations: [
    "One month annualised is a fragile run rate; seasonality and one-off invoices both distort it.",
    "Sector multiples move with the public markets and are stale the moment they are written down.",
  ],
  gate: (ctx) =>
    num(ctx, "mrr_usd") <= 0
      ? "No collected revenue was reported, so there is no run rate to multiply."
      : null,
  run: (ctx) => {
    const mrr = num(ctx, "mrr_usd");
    const arr = mrr * 12;
    const sector = String(ctx.signals.sector ?? "default");
    const baseMultiple = SECTOR_REVENUE_MULTIPLE[sector] ?? SECTOR_REVENUE_MULTIPLE.default;

    const growthAdj = 0.6 + 0.8 * clamp01((num(ctx, "growth_band") || 2) / 4);
    const retentionScore = clamp01((ctx.factors.traction?.adjusted ?? 50) / 100);
    const marginScore = clamp01((ctx.factors.financial?.adjusted ?? 50) / 100);
    const quality = clamp01(0.55 + 0.45 * (0.5 * retentionScore + 0.3 * marginScore + 0.2 * growthAdj));

    const effectiveMultiple = baseMultiple * growthAdj * quality;
    const value = arr * effectiveMultiple;

    const confidence = clamp01(
      revenueMultiple.baseConfidence *
        (0.35 + 0.65 * ((ctx.factors.traction?.confidence ?? 0) * 0.7 + (ctx.factors.financial?.confidence ?? 0) * 0.3)),
    );

    const components: MethodologyComponent[] = [
      {
        key: "arr",
        label: "Run-rate revenue",
        score: clamp01(Math.log10(Math.max(arr, 1)) / 7),
        display: usd(arr),
        from: ["traction"],
        rationale: `${usd(mrr)} collected last month, annualised. Only money that actually arrived is counted.`,
      },
      {
        key: "sector_multiple",
        label: "Sector multiple",
        score: clamp01(baseMultiple / 12),
        display: `${baseMultiple.toFixed(1)}×`,
        from: ["market"],
        rationale: `Companies in this sector are typically valued around ${baseMultiple}× revenue before company-specific adjustment.`,
      },
      {
        key: "growth",
        label: "Growth adjustment",
        score: growthAdj / 1.4,
        display: `${growthAdj.toFixed(2)}×`,
        from: ["traction"],
        rationale: `The reported three-month revenue trajectory ${growthAdj > 1 ? "earns a premium on" : "discounts"} the sector multiple.`,
      },
      {
        key: "quality",
        label: "Retention and margin",
        score: quality,
        display: `${quality.toFixed(2)}×`,
        from: ["traction", "financial"],
        rationale: `Retention and gross margin decide whether the revenue is worth a multiple at all; yours read ${bandWord(quality)}.`,
      },
      {
        key: "effective",
        label: "Effective multiple",
        score: clamp01(effectiveMultiple / 12),
        display: `${effectiveMultiple.toFixed(1)}×`,
        contribution: value,
        from: ["traction", "market", "financial"],
        rationale: `${usd(arr)} × ${effectiveMultiple.toFixed(1)} = ${usd(value)}.`,
      },
    ];

    return {
      range: spreadFrom(value, confidence),
      confidence,
      components,
      assumptions: [
        "Last month's collected revenue is representative of the run rate.",
        `Sector base multiple of ${baseMultiple}× before growth and quality adjustment.`,
      ],
      limitations: revenueMultiple.limitations,
      headline: `${usd(arr)} of run-rate revenue at an effective ${effectiveMultiple.toFixed(1)}× is ${usd(value)}.`,
    };
  },
};

/* ── VC Method ────────────────────────────────────────────────────────── */

/** Growth decays toward a sustainable rate rather than compounding forever. */
function projectRevenue(arr: number, firstYearGrowth: number, years: number): number {
  let revenue = arr;
  let growth = firstYearGrowth;
  for (let year = 0; year < years; year += 1) {
    revenue *= growth;
    growth = 1.15 + (growth - 1.15) * 0.7;
  }
  return revenue;
}

const vcMethod: MethodologyConfig = {
  id: "vc_method",
  name: "VC Method",
  purpose: "Answers what an investor can pay today and still clear their target return.",
  explanation:
    "Project revenue to an exit, apply an exit multiple, then discount back at the return a fund of this stage needs. It is the only method here that works backwards from the investor's own arithmetic.",
  baseConfidence: 0.55,
  stages: ["revenue", "scaling"],
  limitations: [
    "A five-year revenue projection from one month of data is the weakest input in this whole assessment.",
    "Assumes a single exit at a fixed multiple, and ignores the dilution of every round in between.",
  ],
  gate: (ctx) =>
    num(ctx, "mrr_usd") <= 0
      ? "Requires revenue to project forward from. Ask again once customers are paying."
      : null,
  run: (ctx) => {
    const arr = num(ctx, "mrr_usd") * 12;
    const sector = String(ctx.signals.sector ?? "default");
    const exitMultiple = SECTOR_REVENUE_MULTIPLE[sector] ?? SECTOR_REVENUE_MULTIPLE.default;
    const growthBand = num(ctx, "growth_band");
    const firstYearGrowth = [1, 1.2, 1.5, 2.1, 2.8][Math.max(0, Math.min(4, growthBand || 2))];
    const years = 5;
    const requiredIRR = ctx.stage === "scaling" ? 30 : 40;
    const investment = num(ctx, "raise_usd");

    const exitRevenue = projectRevenue(arr, firstYearGrowth, years);
    const breakdown = computeVCBreakdown({
      revenue: exitRevenue,
      netIncomeMargin: 20,
      exitMultiple,
      customMultiple: exitMultiple,
      isOther: false,
      exitYears: years,
      requiredIRR,
      investmentAmount: investment,
    });

    const confidence = clamp01(
      vcMethod.baseConfidence *
        (0.3 + 0.7 * ((ctx.factors.traction?.confidence ?? 0) * 0.6 + (ctx.factors.market?.confidence ?? 0) * 0.4)),
    );

    const components: MethodologyComponent[] = [
      {
        key: "growth",
        label: "First-year growth assumed",
        score: clamp01((firstYearGrowth - 1) / 2),
        display: `${firstYearGrowth.toFixed(1)}×`,
        raw: firstYearGrowth,
        from: ["traction"],
        rationale: `Taken from your reported three-month trajectory, then decayed toward 15% a year — early growth rates do not hold for five years.`,
      },
      {
        key: "exit_revenue",
        label: `Revenue in year ${years}`,
        score: clamp01(Math.log10(Math.max(exitRevenue, 1)) / 8),
        display: usd(exitRevenue),
        raw: exitRevenue,
        from: ["traction", "market"],
        rationale: `${usd(arr)} today compounded at a decaying growth rate for ${years} years.`,
      },
      {
        key: "exit_value",
        label: "Exit value",
        score: clamp01(Math.log10(Math.max(breakdown.exitValue, 1)) / 9),
        display: usd(breakdown.exitValue),
        raw: exitMultiple,
        from: ["market"],
        rationale: `Year-${years} revenue at a ${exitMultiple}× exit multiple.`,
      },
      {
        key: "discount",
        label: `Discounted at ${requiredIRR}%`,
        score: 0.5,
        display: usd(breakdown.postMoney),
        raw: requiredIRR,
        from: ["financial"],
        rationale: `A fund investing at this stage underwrites to roughly ${requiredIRR}% a year. Discounting the exit value back ${years} years gives today's post-money.`,
      },
      {
        key: "pre_money",
        label: "Implied pre-money",
        score: 0.5,
        display: usd(breakdown.preMoney),
        raw: years,
        contribution: breakdown.preMoney,
        from: ["financial"],
        rationale: investment > 0
          ? `Post-money less the ${usd(investment)} you are raising.`
          : `No raise amount was given, so pre-money equals post-money here.`,
      },
    ];

    return {
      range: spreadFrom(breakdown.preMoney, confidence),
      confidence,
      components,
      assumptions: [
        `A ${years}-year hold and a ${requiredIRR}% required annual return.`,
        `Exit at ${exitMultiple}× revenue, the sector convention.`,
        "Growth decays toward 15% a year rather than compounding at today's rate.",
      ],
      limitations: vcMethod.limitations,
      headline: `Working back from a ${usd(breakdown.exitValue)} exit at ${requiredIRR}%, an investor can pay about ${usd(breakdown.preMoney)} today.`,
    };
  },
};

/* ── Cost to duplicate ────────────────────────────────────────────────── */

const costToDuplicate: MethodologyConfig = {
  id: "cost_to_duplicate",
  name: "Cost to Duplicate",
  purpose: "Establishes a floor: what it would cost someone else to rebuild what exists.",
  explanation:
    "Sum what has been spent building the asset, then add a premium for whatever cannot simply be bought — accumulated data, granted IP, a team that has already made the mistakes. It is a floor, never a target.",
  baseConfidence: 0.5,
  stages: ["idea", "prototype", "mvp", "revenue"],
  limitations: [
    "Measures what was spent, not what was created. A team can spend a year building the wrong thing.",
    "Credits nothing for demand, so it will always read low for a company that has customers.",
  ],
  gate: (ctx) => {
    if (num(ctx, "burn_usd") <= 0) return "No monthly spend was reported, so there is nothing to total up.";
    if (num(ctx, "months_active") < 3) return "Under three months of work; the rebuild cost is not yet meaningful.";
    return null;
  },
  run: (ctx) => {
    const burn = num(ctx, "burn_usd");
    const months = num(ctx, "months_active");
    const spent = burn * months;

    const techScore = clamp01((ctx.factors.technology?.adjusted ?? 50) / 100);
    const rebuild = num(ctx, "rebuild_effort");
    const premium = 0.2 + 0.9 * techScore + (rebuild >= 4 ? 0.5 : rebuild >= 3 ? 0.25 : 0);
    const value = spent * (1 + premium);

    const confidence = clamp01(
      costToDuplicate.baseConfidence *
        (0.4 + 0.6 * ((ctx.factors.financial?.confidence ?? 0) * 0.5 + (ctx.factors.technology?.confidence ?? 0) * 0.5)),
    );

    const components: MethodologyComponent[] = [
      {
        key: "spend",
        label: "Spend to date",
        score: clamp01(Math.log10(Math.max(spent, 1)) / 7),
        display: usd(spent),
        contribution: spent,
        from: ["financial"],
        rationale: `${usd(burn)} a month across ${months} months of work.`,
      },
      {
        key: "premium",
        label: "Hard-to-copy premium",
        score: clamp01(premium / 1.6),
        display: `+${Math.round(premium * 100)}%`,
        contribution: value - spent,
        from: ["technology"],
        rationale: `Technical depth reads ${bandWord(techScore)}${rebuild >= 3 ? ", and you estimate a rebuild would take a competent team the better part of a year or more" : ""}.`,
      },
    ];

    return {
      range: spreadFrom(value, confidence),
      confidence,
      components,
      assumptions: [
        "Reported monthly spend has been roughly constant over the period.",
        "Nothing is credited here for market position or demand.",
      ],
      limitations: costToDuplicate.limitations,
      headline: `Rebuilding what exists would cost roughly ${usd(value)} — a floor, not a valuation.`,
    };
  },
};

/* ── Registry ─────────────────────────────────────────────────────────── */

export const METHODOLOGIES: MethodologyConfig[] = [
  berkus,
  scorecard,
  riskFactor,
  revenueMultiple,
  vcMethod,
  costToDuplicate,
];

export const METHODOLOGY_BY_ID: Record<string, MethodologyConfig> = Object.fromEntries(
  METHODOLOGIES.map((m) => [m.id, m]),
);
