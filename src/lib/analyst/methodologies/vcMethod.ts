// VC Method — discount a projected exit value back at the investor's required
// rate of return.
//
// Shared by `src/components/VCMethod.tsx` and the VC Method agent.


export interface VCAnswers {
  revenue: number;
  netIncomeMargin: number;
  exitMultiple: number;
  customMultiple: number;
  isOther: boolean;
  exitYears: number;
  requiredIRR: number;
  investmentAmount: number;
}

export interface VCBreakdown {
  exitValue: number;
  postMoney: number;
  preMoney: number;
  investorOwnershipPct: number;
  netIncomeAtExit: number;
}

export function computeVCBreakdown(answers: VCAnswers): VCBreakdown {
  const revenue = Number(answers?.revenue) || 0;
  const exitMultiple = Number(answers?.exitMultiple) || 0;
  const exitYears = Number(answers?.exitYears) || 0;
  const requiredIRR = Number(answers?.requiredIRR) || 0;
  const investmentAmount = Number(answers?.investmentAmount) || 0;

  const exitValue = revenue * exitMultiple;
  const postMoney = exitValue / Math.pow(1 + requiredIRR / 100, exitYears);
  const preMoney = Math.max(0, postMoney - investmentAmount);

  return {
    exitValue,
    postMoney,
    preMoney,
    investorOwnershipPct: postMoney > 0 ? (investmentAmount / postMoney) * 100 : 0,
    netIncomeAtExit: revenue * ((Number(answers?.netIncomeMargin) || 0) / 100),
  };
}

/** Pre-money valuation, rounded — the figure the manual calculator shows. */
export function computeVCValuation(answers: VCAnswers): number {
  if (!answers || !answers.revenue) return 0;
  return Math.max(0, Math.round(computeVCBreakdown(answers).preMoney));
}
