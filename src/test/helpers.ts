import type {
  InputBundle, MethodologyResult, MethodologyFamily, StartupProfile, ValuationRange,
} from "@/lib/analyst/types";
import { emptyBundle } from "@/lib/analyst/intake";

export function makeBundle(overrides: Partial<InputBundle> = {}): InputBundle {
  const base = emptyBundle();
  return {
    ...base,
    ...overrides,
    manual: { ...base.manual, ...(overrides.manual ?? {}) },
  };
}

export function makeProfile(overrides: Partial<StartupProfile> = {}): StartupProfile {
  return {
    name: "Test Co",
    oneLiner: "A test company.",
    stage: "seed",
    stageRationale: "Has revenue and a small team.",
    industries: ["saas"],
    geography: "EU",
    businessModel: {
      type: "B2B SaaS", revenueModel: "subscription", pricing: "$500/mo",
      customerType: "SMB", unitEconomicsKnown: true, notes: "",
    },
    market: {
      description: "SMB workflow tooling", tam: 5_000_000_000, sam: 400_000_000,
      som: 20_000_000, growthRatePct: 14, sizingBasis: "bottom-up", notes: "",
    },
    product: { description: "A web app", maturity: "beta", differentiation: "faster", notes: "" },
    technology: { description: "standard web stack", coreTech: "none novel", trlEstimate: 7, ipPosition: "none stated", technicalRisk: "low", notes: "" },
    team: { size: 6, founders: "Two technical founders", domainExpertise: "10 years in the sector", gaps: "no sales lead", notes: "" },
    traction: { customers: 24, revenueUsd: 180_000, growthNote: "3x YoY", pilots: "none", notes: "" },
    competition: { landscape: "fragmented", namedCompetitors: ["Acme"], defensibility: "workflow lock-in", notes: "" },
    financials: { monthlyBurnUsd: 40_000, runwayMonths: 11, grossMarginPct: 74, churnRatePct: 3, notes: "" },
    fundraising: { seeking: 1_500_000, instrument: "SAFE", useOfFunds: "sales hires", notes: "" },
    riskFlags: [],
    dataGaps: [],
    evidence: [],
    evidenceQuality: 0.7,
    ...overrides,
  };
}

export function makeResult(
  methodologyId: string,
  overrides: Partial<MethodologyResult> = {},
): MethodologyResult {
  return {
    methodologyId,
    name: methodologyId,
    family: "valuation" as MethodologyFamily,
    status: "completed",
    headline: "",
    inputs: {},
    computed: {},
    reasoning: "",
    assumptions: [],
    limitations: [],
    missingInputs: [],
    evidence: [],
    risks: [],
    confidence: 0.7,
    ...overrides,
  };
}

export const range = (low: number, point: number, high: number): ValuationRange => ({
  low, point, high, currency: "USD",
});
