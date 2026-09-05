// Back-compat shim. The valuation maths now lives with each methodology in
// `src/lib/analyst/methodologies/`, so the manual calculators and the
// autonomous agents compute from exactly the same code.

export { computeVCValuation, computeVCBreakdown } from "@/lib/analyst/methodologies/vcMethod";
export { computeChicagoValuation, computeChicagoBreakdown } from "@/lib/analyst/methodologies/firstChicago";
export type { VCAnswers } from "@/lib/analyst/methodologies/vcMethod";
export type { ChicagoAnswers } from "@/lib/analyst/methodologies/firstChicago";
