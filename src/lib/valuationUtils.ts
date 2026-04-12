import type { VCAnswers, ChicagoAnswers } from "@/context/StartupContext";

export function computeVCValuation(answers: VCAnswers): number {
  if (!answers || !answers.revenue) return 0;
  const exitValue = answers.revenue * answers.exitMultiple;
  const presentValue = exitValue / Math.pow(1 + answers.requiredIRR / 100, answers.exitYears);
  return Math.max(0, Math.round(presentValue - answers.investmentAmount));
}

export function computeChicagoValuation(answers: ChicagoAnswers): number {
  if (!answers || !answers.revenue) return 0;
  const exitValue = answers.revenue * answers.exitMultiple;
  const pvWorst = exitValue / Math.pow(1 + answers.discountRates.worst / 100, answers.yearsToExit);
  const pvBase = exitValue / Math.pow(1 + answers.discountRates.base / 100, answers.yearsToExit);
  const pvBest = exitValue / Math.pow(1 + answers.discountRates.best / 100, answers.yearsToExit);
  return Math.round(
    (pvWorst * answers.probabilities.worst / 100) +
    (pvBase * answers.probabilities.base / 100) +
    (pvBest * answers.probabilities.best / 100)
  );
}
