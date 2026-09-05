// Risk Factor Summation — adjust a base valuation by twelve risk categories,
// each worth ±$250k per grid step.
//
// Shared by the manual calculator (`src/components/RiskFactorMethod.tsx`) and
// the Risk Factor agent. The calculator uses the fixed default base; the agent
// may substitute a comparables-derived base, which is what the published
// method actually calls for — any resulting divergence is surfaced by
// cross-validation rather than hidden.


export const RISK_ADJUSTMENT_PER_POINT = 250000;
export const RISK_BASE_VALUATION = 250000;

export const RISK_KEYS = [
  "management", "stage", "legislation", "supply", "sales_marketing",
  "funding", "competition", "technology", "international", "reputation",
  "exit", "political",
] as const;

export type RiskKey = (typeof RISK_KEYS)[number];

/** −2 (very high risk) … +2 (very low risk). */
export const RISK_SCORE_VALUES = [-2, -1, 0, 1, 2];
export const RISK_SCORE_KEYS = ["very_high", "high", "average", "low", "very_low"];

export function computeRiskFactor(
  scores: (number | null)[],
  baseValuation: number = RISK_BASE_VALUATION,
): number {
  const adjustment = scores.reduce<number>(
    (sum, score) => sum + (score !== null && score !== undefined ? score * RISK_ADJUSTMENT_PER_POINT : 0),
    0,
  );
  return Math.max(0, baseValuation + adjustment);
}
