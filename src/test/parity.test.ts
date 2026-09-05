// Cross-language parity.
//
// `fixtures/methodology-parity.json` is asserted by both this suite and the
// Python suite in `ai/tests/test_parity.py`. If the Python agent service and
// the TypeScript manual calculators ever compute a published formula
// differently, one of the two fails here rather than producing two different
// valuations in production.

import { describe, it, expect } from "vitest";
import fixture from "../../fixtures/methodology-parity.json";

import { computeBerkus } from "@/lib/analyst/methodologies/berkus";
import { computeScorecard, computeScorecardWeight } from "@/lib/analyst/methodologies/scorecard";
import { computeRiskFactor } from "@/lib/analyst/methodologies/riskFactor";
import { computeVCBreakdown, computeVCValuation } from "@/lib/analyst/methodologies/vcMethod";
import {
  computeChicagoValuation, normaliseProbabilities, type ChicagoScenario,
} from "@/lib/analyst/methodologies/firstChicago";
import {
  READINESS_CRITERIA, computeReadinessLevel, readinessKey, type ReadinessPrefix,
} from "@/lib/analyst/methodologies/readiness";
import { computeFinancialHealthScore } from "@/lib/analyst/methodologies/financial";

const cases = <T,>(key: string): T[] => (fixture as any)[key] as T[];

describe("parity: Berkus", () => {
  cases<any>("berkus").forEach((entry) => {
    it(entry.case, () => {
      expect(computeBerkus(entry.scores)).toBe(entry.expected);
    });
  });
});

describe("parity: Scorecard", () => {
  cases<any>("scorecard").forEach((entry) => {
    it(entry.case, () => {
      expect(computeScorecard(entry.scores, entry.median)).toBe(entry.expected);
    });
  });

  cases<any>("scorecardWeight").forEach((entry) => {
    it(`weight — ${entry.case}`, () => {
      expect(computeScorecardWeight(entry.scores)).toBeCloseTo(entry.expected, 9);
    });
  });
});

describe("parity: Risk Factor Summation", () => {
  cases<any>("riskFactor").forEach((entry) => {
    it(entry.case, () => {
      expect(computeRiskFactor(entry.scores, entry.base)).toBe(entry.expected);
    });
  });
});

describe("parity: VC Method", () => {
  cases<any>("vcMethod").forEach((entry) => {
    it(entry.case, () => {
      const answers = {
        revenue: entry.revenue,
        exitMultiple: entry.exitMultiple,
        exitYears: entry.exitYears,
        requiredIRR: entry.requiredIrr,
        investmentAmount: entry.investmentAmount,
        netIncomeMargin: 0,
        customMultiple: 0,
        isOther: false,
      };
      expect(computeVCBreakdown(answers).exitValue).toBe(entry.expectedExitValue);
      expect(computeVCValuation(answers)).toBe(entry.expected);
    });
  });
});

describe("parity: First Chicago", () => {
  cases<any>("firstChicago").forEach((entry) => {
    it(entry.case, () => {
      expect(computeChicagoValuation({
        revenue: entry.revenue,
        exitMultiple: entry.exitMultiple,
        yearsToExit: entry.yearsToExit,
        discountRates: entry.discountRates,
        probabilities: entry.probabilities,
        customMultiple: 0,
        isOther: false,
      })).toBe(entry.expected);
    });
  });

  cases<any>("probabilityNormalisation").forEach((entry) => {
    it(`probabilities — ${entry.case}`, () => {
      expect(normaliseProbabilities(entry.input as Record<ChicagoScenario, number>)).toEqual(entry.expected);
    });
  });
});

describe("parity: Readiness levels", () => {
  cases<any>("readiness").forEach((entry) => {
    it(entry.case, () => {
      const prefix = entry.prefix as ReadinessPrefix;
      const answers: Record<string, boolean> = {};
      for (let level = 1; level <= entry.completeThrough; level++) {
        const [mandatory] = READINESS_CRITERIA[prefix][level - 1];
        for (let index = 0; index < mandatory; index++) {
          answers[readinessKey(prefix, level, "M", index)] = true;
        }
      }
      if (entry.removeMandatoryAtLevel) {
        delete answers[readinessKey(prefix, entry.removeMandatoryAtLevel, "M", 0)];
      }
      expect(computeReadinessLevel(answers, prefix)).toBe(entry.expected);
    });
  });
});

describe("parity: Financial health", () => {
  cases<any>("financialHealth").forEach((entry) => {
    it(entry.case, () => {
      expect(computeFinancialHealthScore(entry.snapshot)).toBe(entry.expected);
    });
  });
});
