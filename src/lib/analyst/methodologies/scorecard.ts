// Scorecard (Payne) Method — adjust a regional/sector median pre-money
// valuation by seven weighted comparison factors.
//
// Shared by the manual calculator (`src/components/ScorecardMethod.tsx`) and
// the Scorecard agent.


export const SCORECARD_FACTOR_KEYS = [
  "team", "market", "product", "competitive", "sales", "financing", "other",
] as const;

export type ScorecardFactorKey = (typeof SCORECARD_FACTOR_KEYS)[number];

export const SCORECARD_WEIGHTS = [0.30, 0.25, 0.15, 0.10, 0.10, 0.05, 0.05];
export const SCORECARD_WEIGHT_LABELS = ["30%", "25%", "15%", "10%", "10%", "5%", "5%"];

/** The five allowed comparison scores, as a percentage of the median company. */
export const SCORECARD_SCORE_VALUES = [60, 80, 100, 120, 150];
export const SCORECARD_SCORE_KEYS = ["very_weak", "weak", "average", "strong", "very_strong"];

/** Σ (score/100 × weight). 1.0 means "exactly the median company". */
export function computeScorecardWeight(scores: (number | null)[]): number {
  return SCORECARD_FACTOR_KEYS.reduce((sum, _key, i) => {
    const score = scores[i] !== null && scores[i] !== undefined ? (scores[i] as number) / 100 : 0;
    return sum + score * SCORECARD_WEIGHTS[i];
  }, 0);
}

export function computeScorecard(scores: (number | null)[], medianValuation: number): number {
  return Math.round((medianValuation || 0) * computeScorecardWeight(scores));
}

/** Snap a free number onto the nearest allowed grid value. */
export function snapScorecardScore(value: unknown): number {
  const n = Number(value);
  if (!isFinite(n)) return 100;
  return SCORECARD_SCORE_VALUES.reduce((best, candidate) =>
    Math.abs(candidate - n) < Math.abs(best - n) ? candidate : best,
  );
}
