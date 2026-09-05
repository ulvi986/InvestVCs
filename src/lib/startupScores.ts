// Overall readiness scoring.
//
// Extracted so the Workflow page and the Overall Summary page cannot drift
// apart. The readiness levels and the financial health score come from the
// same methodology modules the autonomous analyst uses, so a founder reading
// the summary and an agent reading the registry are looking at one number.

import { computeVCValuation, computeChicagoValuation } from "@/lib/valuationUtils";
import { READINESS_MAX_LEVEL, computeReadinessLevel } from "@/lib/analyst/methodologies/readiness";
import { computeFinancialHealthScore } from "@/lib/analyst/methodologies/financial";

export interface ScoreInput {
  evaluation: {
    berkus: number;
    scorecard: number;
    riskFactor: number;
    vcAnswers: unknown;
    chicagoAnswers: unknown;
  };
  readiness: {
    trlAnswers: unknown;
    crlAnswers: unknown;
    frlAnswers: unknown;
  };
  snapshots: unknown[];
}

export interface StartupScores {
  trlLevel: number;
  crlLevel: number;
  frlLevel: number;
  maxLevel: number;

  financialScore: number;
  riskScore: number;
  trlScore: number;
  founderScore: number;
  investmentScore: number;
  maturityScore: number;
  globalScore: number;

  avgValuation: number;
  seedAvg: number;
  vcValuation: number;
  chicagoValuation: number;

  hasEvaluation: boolean;
  hasFinancial: boolean;
  hasReadiness: boolean;
  hasAnyData: boolean;
}

const mean = (values: number[]) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

/** Mean of the scores that have actually been filled in. Empty modules do not
 *  drag the total down; they simply do not count yet. */
const meanOfActive = (values: number[]) => mean(values.filter((value) => value > 0));

export function computeStartupScores(input: ScoreInput): StartupScores {
  const { evaluation, readiness, snapshots } = input;
  const { berkus, scorecard, riskFactor, vcAnswers, chicagoAnswers } = evaluation;

  const trlLevel = computeReadinessLevel(readiness.trlAnswers as any, "TRL");
  const crlLevel = computeReadinessLevel(readiness.crlAnswers as any, "CRL");
  const frlLevel = computeReadinessLevel(readiness.frlAnswers as any, "FRL");

  const latestSnapshot = snapshots.length ? snapshots[snapshots.length - 1] : null;

  const vcValuation = computeVCValuation(vcAnswers as any);
  const chicagoValuation = computeChicagoValuation(chicagoAnswers as any);
  const seedAvg = mean([vcValuation, chicagoValuation].filter((v) => v > 0));
  const avgValuation = mean([berkus, scorecard, riskFactor].filter((v) => v > 0));

  const hasEvaluation = berkus > 0 || scorecard > 0 || riskFactor > 0;
  const hasFinancial = snapshots.length > 0;
  const hasReadiness = trlLevel > 0 || crlLevel > 0 || frlLevel > 0;

  const financialScore = computeFinancialHealthScore(latestSnapshot as any);
  // Valuation as a proxy for de-risking, capped so a large number cannot
  // dominate the composite.
  const riskScore = hasEvaluation ? Math.min(Math.round((avgValuation / 2_500_000) * 100), 100) : 0;
  const trlScore = Math.round((trlLevel / READINESS_MAX_LEVEL) * 100);
  const founderScore = Math.round((crlLevel / READINESS_MAX_LEVEL) * 100);
  const investmentScore = Math.round((frlLevel / READINESS_MAX_LEVEL) * 100);

  const maturityScore = Math.round(
    meanOfActive([financialScore, riskScore, trlScore, founderScore, investmentScore]) * 0.6,
  );
  const globalScore = meanOfActive([
    financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore,
  ]);

  return {
    trlLevel, crlLevel, frlLevel, maxLevel: READINESS_MAX_LEVEL,
    financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore, globalScore,
    avgValuation, seedAvg, vcValuation, chicagoValuation,
    hasEvaluation, hasFinancial, hasReadiness,
    hasAnyData: hasEvaluation || hasFinancial || hasReadiness,
  };
}
