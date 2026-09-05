// First Chicago Method — probability-weighted worst / base / best scenarios,
// each discounted at its own rate.
//
// Shared by `src/components/SeedValuation.tsx` and the First Chicago agent.


export interface ChicagoAnswers {
  revenue: number;
  exitMultiple: number;
  customMultiple: number;
  isOther: boolean;
  yearsToExit: number;
  discountRates: { worst: number; base: number; best: number };
  probabilities: { worst: number; base: number; best: number };
}

export type ChicagoScenario = "worst" | "base" | "best";
export const CHICAGO_SCENARIOS: ChicagoScenario[] = ["worst", "base", "best"];

export interface ChicagoBreakdown {
  exitValue: number;
  presentValues: Record<ChicagoScenario, number>;
  weighted: number;
}

export function computeChicagoBreakdown(answers: ChicagoAnswers): ChicagoBreakdown {
  const revenue = Number(answers?.revenue) || 0;
  const exitMultiple = Number(answers?.exitMultiple) || 0;
  const years = Number(answers?.yearsToExit) || 0;
  const exitValue = revenue * exitMultiple;

  const presentValues = CHICAGO_SCENARIOS.reduce((acc, scenario) => {
    const rate = Number(answers?.discountRates?.[scenario]) || 0;
    acc[scenario] = exitValue / Math.pow(1 + rate / 100, years);
    return acc;
  }, {} as Record<ChicagoScenario, number>);

  const weighted = CHICAGO_SCENARIOS.reduce((sum, scenario) => {
    const probability = Number(answers?.probabilities?.[scenario]) || 0;
    return sum + (presentValues[scenario] * probability) / 100;
  }, 0);

  return { exitValue, presentValues, weighted };
}

export function computeChicagoValuation(answers: ChicagoAnswers): number {
  if (!answers || !answers.revenue) return 0;
  return Math.round(computeChicagoBreakdown(answers).weighted);
}

/** Rescale probabilities to sum to 100 without letting one scenario vanish. */
export function normaliseProbabilities(p: Record<ChicagoScenario, number>): Record<ChicagoScenario, number> {
  const values = CHICAGO_SCENARIOS.map((s) => Math.max(0, Number(p?.[s]) || 0));
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return { worst: 20, base: 70, best: 10 };
  const scaled = values.map((v) => (v / total) * 100);
  // Push rounding drift into the base case so the three always sum to 100.
  const worst = Math.round(scaled[0]);
  const best = Math.round(scaled[2]);
  return { worst, base: 100 - worst - best, best };
}
