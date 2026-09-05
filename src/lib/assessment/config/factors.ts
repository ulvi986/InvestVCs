// Factors, stages and sections.
//
// These are the derived variables. The founder never sets one directly; the
// engine reads them out of the answers. Weights are per stage because what
// matters at idea stage is not what matters at revenue stage — judging a
// pre-product company on traction weight is how you get a wrong answer
// confidently.

import type { FactorConfig, FactorKey, SectionConfig, StageConfig, StageKey } from "../types";

export const STAGES: StageConfig[] = [
  { key: "idea", label: "Idea", description: "A thesis and a plan. Nothing built yet.", rank: 0 },
  { key: "prototype", label: "Prototype", description: "Something exists, no outside users.", rank: 1 },
  { key: "mvp", label: "MVP / Live", description: "Real users, no meaningful revenue.", rank: 2 },
  { key: "revenue", label: "Revenue", description: "Customers paying, repeatably.", rank: 3 },
  { key: "scaling", label: "Scaling", description: "Growth compounding on known unit economics.", rank: 4 },
];

export const STAGE_BY_KEY: Record<StageKey, StageConfig> = Object.fromEntries(
  STAGES.map((s) => [s.key, s]),
) as Record<StageKey, StageConfig>;

export const stageRank = (stage: StageKey): number => STAGE_BY_KEY[stage]?.rank ?? 0;

export const SECTIONS: SectionConfig[] = [
  { key: "company", label: "The company", intro: "Let's establish what exists today.", order: 0 },
  { key: "team", label: "Team", intro: "Now the people building it.", order: 1 },
  { key: "market", label: "Market", intro: "How you know the market is there.", order: 2 },
  { key: "product", label: "Product & technology", intro: "What has actually been built.", order: 3 },
  { key: "traction", label: "Traction", intro: "What users have actually done.", order: 4 },
  { key: "gtm", label: "Go-to-market", intro: "How customers reach you, and at what cost.", order: 5 },
  { key: "competition", label: "Competition", intro: "Who else is solving this, and what protects you.", order: 6 },
  { key: "financials", label: "Financials", intro: "Runway, margins and the shape of the raise.", order: 7 },
  { key: "risk", label: "Risk", intro: "The things that could stop this working.", order: 8 },
];

export const SECTION_BY_KEY: Record<string, SectionConfig> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s]),
);

/**
 * Overall-score weights. Each stage column sums to 1. Traction earns weight
 * as the company gets later; team and market carry the early stages, because
 * at idea stage they are the only evidence that exists.
 */
export const FACTORS: FactorConfig[] = [
  {
    key: "team",
    label: "Team",
    definition: "Whether these specific people can build and sell this specific thing.",
    overallWeight: { default: 0.18, idea: 0.32, prototype: 0.28, mvp: 0.22, revenue: 0.16, scaling: 0.13 },
  },
  {
    key: "market",
    label: "Market",
    definition: "Whether the opportunity is large, growing, and sized from something real.",
    overallWeight: { default: 0.16, idea: 0.26, prototype: 0.20, mvp: 0.17, revenue: 0.14, scaling: 0.13 },
  },
  {
    key: "product",
    label: "Product",
    definition: "How far the product has advanced from concept toward something people rely on.",
    overallWeight: { default: 0.14, idea: 0.12, prototype: 0.18, mvp: 0.17, revenue: 0.13, scaling: 0.11 },
  },
  {
    key: "technology",
    label: "Technology",
    definition: "Technical depth, feasibility and whatever is hard for others to reproduce.",
    overallWeight: { default: 0.10, idea: 0.12, prototype: 0.12, mvp: 0.10, revenue: 0.08, scaling: 0.07 },
  },
  {
    key: "traction",
    label: "Traction",
    definition: "Demonstrated demand: usage, retention and revenue that actually happened.",
    overallWeight: { default: 0.18, idea: 0.04, prototype: 0.06, mvp: 0.16, revenue: 0.25, scaling: 0.28 },
  },
  {
    key: "competition",
    label: "Competition",
    definition: "Competitive intensity and how durable your position is inside it.",
    overallWeight: { default: 0.08, idea: 0.06, prototype: 0.06, mvp: 0.07, revenue: 0.08, scaling: 0.09 },
  },
  {
    key: "gtm",
    label: "Go-to-market",
    definition: "Whether a repeatable channel exists to reach customers at a viable cost.",
    overallWeight: { default: 0.08, idea: 0.04, prototype: 0.05, mvp: 0.06, revenue: 0.09, scaling: 0.11 },
  },
  {
    key: "financial",
    label: "Financial health",
    definition: "Runway, margin structure and how much capital the plan still needs.",
    overallWeight: { default: 0.05, idea: 0.02, prototype: 0.03, mvp: 0.03, revenue: 0.05, scaling: 0.06 },
  },
  {
    key: "relationships",
    label: "Relationships",
    definition: "Partners, advisors, pilots and institutional backing that de-risk the plan.",
    overallWeight: { default: 0.03, idea: 0.02, prototype: 0.02, mvp: 0.02, revenue: 0.02, scaling: 0.02 },
  },
];

export const FACTOR_KEYS: FactorKey[] = FACTORS.map((f) => f.key);

export const FACTOR_BY_KEY: Record<FactorKey, FactorConfig> = Object.fromEntries(
  FACTORS.map((f) => [f.key, f]),
) as Record<FactorKey, FactorConfig>;

export const factorWeight = (key: FactorKey, stage: StageKey): number => {
  const config = FACTOR_BY_KEY[key];
  if (!config) return 0;
  return config.overallWeight[stage] ?? config.overallWeight.default;
};
