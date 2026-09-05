// TypeScript-side methodology helpers.
//
// The published formulas themselves are covered by `parity.test.ts`, which
// asserts the same fixture the Python service asserts. This file covers only
// the helpers the manual calculators use on top of them.

import { describe, it, expect } from "vitest";

import { BERKUS_COMPONENT_KEYS, BERKUS_MAX, BERKUS_SCORE_TO_VALUE, computeBerkus } from "@/lib/analyst/methodologies/berkus";
import {
  SCORECARD_FACTOR_KEYS, SCORECARD_SCORE_VALUES, SCORECARD_WEIGHTS, snapScorecardScore,
} from "@/lib/analyst/methodologies/scorecard";
import { RISK_KEYS, RISK_SCORE_VALUES } from "@/lib/analyst/methodologies/riskFactor";
import { computeVCBreakdown } from "@/lib/analyst/methodologies/vcMethod";
import { computeChicagoBreakdown } from "@/lib/analyst/methodologies/firstChicago";
import {
  READINESS_CRITERIA, READINESS_MAX_LEVEL, allMandatoryMet, computeMaxUnlockedLevel,
  computeReadinessLevel, readinessKey,
} from "@/lib/analyst/methodologies/readiness";
import { financialCoverage } from "@/lib/analyst/methodologies/financial";
import { BMC_BLOCK_KEYS, bmcFilledBlocks } from "@/lib/analyst/methodologies/bmc";

describe("Berkus constants", () => {
  it("has five components and a $2.5M ceiling", () => {
    expect(BERKUS_COMPONENT_KEYS).toHaveLength(5);
    expect(BERKUS_MAX).toBe(2_500_000);
    expect(computeBerkus(BERKUS_COMPONENT_KEYS.map(() => 5))).toBe(BERKUS_MAX);
  });

  it("maps every grid position to a value", () => {
    [0, 1, 2, 3, 4, 5].forEach((score) => expect(BERKUS_SCORE_TO_VALUE[score]).toBeTypeOf("number"));
  });

  it("ignores an out-of-grid score rather than throwing", () => {
    expect(computeBerkus([9 as number])).toBe(0);
  });
});

describe("Scorecard grid", () => {
  it("has seven factors whose weights sum to 1", () => {
    expect(SCORECARD_FACTOR_KEYS).toHaveLength(7);
    expect(SCORECARD_WEIGHTS).toHaveLength(7);
    expect(SCORECARD_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("snaps a free number onto the nearest allowed grid value", () => {
    expect(snapScorecardScore(117)).toBe(120);
    expect(snapScorecardScore(0)).toBe(60);
    expect(snapScorecardScore(999)).toBe(150);
    expect(snapScorecardScore("not a number")).toBe(100);
    SCORECARD_SCORE_VALUES.forEach((value) => expect(snapScorecardScore(value)).toBe(value));
  });
});

describe("Risk Factor grid", () => {
  it("has twelve categories on a five-point scale", () => {
    expect(RISK_KEYS).toHaveLength(12);
    expect(RISK_SCORE_VALUES).toEqual([-2, -1, 0, 1, 2]);
  });
});

describe("VC Method breakdown", () => {
  const answers = {
    revenue: 10_000_000, netIncomeMargin: 20, exitMultiple: 5, customMultiple: 0,
    isOther: false, exitYears: 5, requiredIRR: 30, investmentAmount: 1_000_000,
  };

  it("reports investor ownership against post-money", () => {
    const { postMoney, investorOwnershipPct } = computeVCBreakdown(answers);
    expect(investorOwnershipPct).toBeCloseTo((1_000_000 / postMoney) * 100, 6);
  });

  it("reports net income at exit from the margin", () => {
    expect(computeVCBreakdown(answers).netIncomeAtExit).toBe(2_000_000);
  });

  it("does not divide by zero when post-money is zero", () => {
    expect(computeVCBreakdown({ ...answers, revenue: 0 }).investorOwnershipPct).toBe(0);
  });
});

describe("First Chicago breakdown", () => {
  it("discounts each scenario at its own rate", () => {
    const { presentValues, exitValue } = computeChicagoBreakdown({
      revenue: 10_000_000, exitMultiple: 5, customMultiple: 0, isOther: false, yearsToExit: 5,
      discountRates: { worst: 50, base: 30, best: 20 },
      probabilities: { worst: 20, base: 70, best: 10 },
    });
    expect(exitValue).toBe(50_000_000);
    expect(presentValues.worst).toBeLessThan(presentValues.base);
    expect(presentValues.base).toBeLessThan(presentValues.best);
  });
});

describe("Readiness helpers", () => {
  const complete = (prefix: "TRL" | "CRL" | "FRL", upTo: number) => {
    const answers: Record<string, boolean> = {};
    for (let level = 1; level <= upTo; level++) {
      const [mandatory] = READINESS_CRITERIA[prefix][level - 1];
      for (let index = 0; index < mandatory; index++) {
        answers[readinessKey(prefix, level, "M", index)] = true;
      }
    }
    return answers;
  };

  it("defines nine levels for each scale", () => {
    (["TRL", "CRL", "FRL"] as const).forEach((prefix) => {
      expect(READINESS_CRITERIA[prefix]).toHaveLength(READINESS_MAX_LEVEL);
    });
  });

  it("reports whether a level's mandatory criteria are met", () => {
    const answers = complete("TRL", 2);
    expect(allMandatoryMet(answers, "TRL", 1, 1)).toBe(true);
    expect(allMandatoryMet(answers, "TRL", 3, 2)).toBe(false);
  });

  it("unlocks the next level for editing once the current one is complete", () => {
    const answers = complete("TRL", 3);
    const level = computeReadinessLevel(answers, "TRL");
    expect(computeMaxUnlockedLevel(answers, "TRL", level)).toBeGreaterThanOrEqual(level);
  });

  it("never unlocks past the end of the scale", () => {
    const answers = complete("TRL", 9);
    expect(computeMaxUnlockedLevel(answers, "TRL", 9)).toBe(READINESS_MAX_LEVEL - 1);
  });
});

describe("Financial coverage", () => {
  it("reports which health inputs are present and missing", () => {
    const coverage = financialCoverage({ revenue: { total: 1 } });
    expect(coverage.present).toContain("revenue");
    expect(coverage.missing).toContain("runway");
    expect(coverage.ratio).toBeLessThan(1);
  });

  it("treats NaN as absent, not as a value", () => {
    const coverage = financialCoverage({ customerMetrics: { churnRate: NaN } });
    expect(coverage.present).not.toContain("churn");
  });

  it("reports nothing present for a missing snapshot", () => {
    expect(financialCoverage(null).present).toEqual([]);
    expect(financialCoverage(null).ratio).toBe(0);
  });
});

describe("Business Model Canvas", () => {
  it("has nine blocks", () => {
    expect(BMC_BLOCK_KEYS).toHaveLength(9);
  });

  it("counts only blocks with real content", () => {
    expect(bmcFilledBlocks({ key_partners: "Acme", channels: "   ", revenue_streams: "subs" }))
      .toEqual(["key_partners", "revenue_streams"]);
  });

  it("returns an empty list for a missing canvas", () => {
    expect(bmcFilledBlocks(null)).toEqual([]);
    expect(bmcFilledBlocks({})).toEqual([]);
  });
});
