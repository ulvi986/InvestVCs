// Core domain types for the autonomous investment-analysis system.
//
// Everything the agents exchange is typed here. Agents never hand each other
// free-form prose: they hand each other these structures, which is what makes
// cross-validation, confidence scoring and traceability possible at all.

export type StartupStage = "idea" | "pre_seed" | "seed" | "series_a" | "growth";

export const STARTUP_STAGES: StartupStage[] = ["idea", "pre_seed", "seed", "series_a", "growth"];

export type IndustryTag =
  | "saas" | "deeptech" | "hardware" | "biotech" | "healthtech" | "fintech"
  | "marketplace" | "consumer" | "ecommerce" | "ai" | "climate" | "industrial"
  | "gaming" | "edtech" | "other";

export const INDUSTRY_TAGS: IndustryTag[] = [
  "saas", "deeptech", "hardware", "biotech", "healthtech", "fintech",
  "marketplace", "consumer", "ecommerce", "ai", "climate", "industrial",
  "gaming", "edtech", "other",
];

/** Where a piece of information actually came from. Drives evidence quality. */
export type SourceType =
  | "provided"   // founder stated it directly (deck, form, financial snapshot)
  | "derived"    // computed deterministically from provided data
  | "inferred"   // the model reasoned it from context — weakest
  | "absent";    // known to be missing; recorded so the gap is explicit

/**
 * The unit of accountability. Every material conclusion in the final report
 * must resolve to one of these.
 */
export interface EvidenceRef {
  id: string;
  claim: string;
  evidence: string;
  source: string;
  sourceType: SourceType;
  confidence: number; // 0..1
  methodology: string; // methodology or agent id that produced the claim
  reasoning: string;
}

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface RiskItem {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  likelihood: number; // 0..1
  mitigation: string;
  evidence: string[];
  source: string; // agent/methodology id
}

export interface GapItem {
  field: string;
  why: string;
  blocks: string[]; // methodology ids that would improve if this were answered
  question: string; // the question to actually put to the founder
}

export type MethodologyStatus =
  | "queued" | "running" | "completed" | "failed" | "skipped" | "insufficient_input";

export interface ValuationRange {
  low: number;
  point: number;
  high: number;
  currency: "USD";
}

export type MethodologyFamily =
  | "valuation" | "readiness" | "business_model" | "market"
  | "financial" | "competitive" | "risk" | "team" | "traction";

/**
 * Result of one methodology. `inputs` are the parameters (assigned by the
 * agent or supplied by the user), `computed` is what the deterministic
 * methodology code derived from them. That split is deliberate: the LLM never
 * invents a valuation number, it only assigns the factor scores that the
 * methodology's published formula consumes.
 */
export interface MethodologyResult {
  methodologyId: string;
  name: string;
  family: MethodologyFamily;
  status: MethodologyStatus;
  headline: string;
  valuation?: ValuationRange;
  /** Normalised 0..10 quality score, comparable across methodologies. */
  score10?: number;
  inputs: Record<string, unknown>;
  computed: Record<string, unknown>;
  reasoning: string;
  assumptions: string[];
  limitations: string[];
  missingInputs: string[];
  evidence: EvidenceRef[];
  risks: RiskItem[];
  confidence: number; // 0..1
  error?: string;
  durationMs?: number;
}

export interface InputSpec {
  key: string;
  label: string;
  description: string;
  /** Dot-path into the StartupProfile / InputBundle that satisfies this input. */
  path?: string;
}

/** Minimal JSON-schema subset understood by the agent gateway. */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean | JsonSchema;
}

export interface ApplicabilityVerdict {
  applicable: boolean;
  /** 0..1 — how well this methodology fits the startup, before the LLM ranks. */
  fit: number;
  reason: string;
}

export interface ComputeContext {
  profile: StartupProfile;
  bundle: InputBundle;
  results: Record<string, MethodologyResult>;
}

export interface ComputeOutput {
  valuation?: ValuationRange;
  score10?: number;
  computed: Record<string, unknown>;
  /** Deterministic reasons to lower confidence (e.g. unanswered factors). */
  confidencePenalty?: number;
  notes?: string[];
}

export interface MethodologySpec {
  id: string;
  name: string;
  family: MethodologyFamily;
  description: string;
  /** What question this methodology is actually able to answer. */
  purpose: string;
  requiredInputs: InputSpec[];
  optionalInputs: InputSpec[];
  outputSchema: JsonSchema;
  applicableStages: StartupStage[];
  applicableIndustries: IndustryTag[] | "any";
  excludedIndustries?: IndustryTag[];
  /** Ceiling on how much this methodology can ever be trusted on its own. */
  baseConfidence: number;
  limitations: string[];
  /** Methodology ids that must complete first. */
  dependsOn: string[];
  /** Lower runs earlier. Same priority + satisfied deps => runs in parallel. */
  priority: number;
  /** Instruction handed to the methodology agent. */
  instruction: string;
  /** Deterministic post-processing of the agent's assigned inputs. */
  compute?: (inputs: Record<string, any>, ctx: ComputeContext) => ComputeOutput;
  /** Deterministic applicability pre-filter, run before the planner LLM. */
  gate?: (profile: StartupProfile, bundle: InputBundle) => ApplicabilityVerdict;
}

// ── Startup understanding ────────────────────────────────────────────────

export interface StartupProfile {
  name: string;
  oneLiner: string;
  stage: StartupStage;
  stageRationale: string;
  industries: IndustryTag[];
  geography: string;
  businessModel: {
    type: string;
    revenueModel: string;
    pricing: string;
    customerType: string;
    unitEconomicsKnown: boolean;
    notes: string;
  };
  market: {
    description: string;
    tam: number | null;
    sam: number | null;
    som: number | null;
    growthRatePct: number | null;
    sizingBasis: string;
    notes: string;
  };
  product: { description: string; maturity: string; differentiation: string; notes: string };
  technology: {
    description: string;
    coreTech: string;
    trlEstimate: number | null;
    ipPosition: string;
    technicalRisk: string;
    notes: string;
  };
  team: {
    size: number | null;
    founders: string;
    domainExpertise: string;
    gaps: string;
    notes: string;
  };
  traction: {
    customers: number | null;
    revenueUsd: number | null;
    growthNote: string;
    pilots: string;
    notes: string;
  };
  competition: { landscape: string; namedCompetitors: string[]; defensibility: string; notes: string };
  financials: {
    monthlyBurnUsd: number | null;
    runwayMonths: number | null;
    grossMarginPct: number | null;
    churnRatePct: number | null;
    notes: string;
  };
  fundraising: { seeking: number | null; instrument: string; useOfFunds: string; notes: string };
  riskFlags: string[];
  dataGaps: GapItem[];
  evidence: EvidenceRef[];
  /** 0..1 — how much of the profile is grounded in provided (not inferred) data. */
  evidenceQuality: number;
}

// ── Inputs ───────────────────────────────────────────────────────────────

/** Everything the user gave us, normalised. Agents read only from here. */
export interface InputBundle {
  startupName: string;
  narrative: string;          // free-text description the user typed
  pitchDeckText: string;      // extracted deck text
  pitchDeckFileName: string;
  bmc: Record<string, string>;
  financialSnapshot: Record<string, any> | null;
  financialHistory: Record<string, any>[];
  /** Answers the user already gave in the manual calculators, if any. */
  manual: {
    berkusAnswers: (number | null)[];
    scorecardAnswers: (number | null)[];
    scorecardMedian: number;
    riskAnswers: (number | null)[];
    vcAnswers: Record<string, any> | null;
    chicagoAnswers: Record<string, any> | null;
    trlAnswers: Record<string, boolean>;
    crlAnswers: Record<string, boolean>;
    frlAnswers: Record<string, boolean>;
  };
  /** Corrections the user made to extracted data (human-in-the-loop). */
  corrections: Record<string, unknown>;
  /** Extra answers the user supplied in response to identified gaps. */
  gapAnswers: Record<string, string>;
}

// ── Planning ─────────────────────────────────────────────────────────────

export interface MethodologyPlanEntry {
  methodologyId: string;
  selected: boolean;
  /** The agent's explanation, surfaced verbatim in the report. */
  reason: string;
  priority: number;
  expectedConfidence: number;
  /** Set when the deterministic gate, not the planner, made the call. */
  gatedOut?: string;
}

export interface AnalysisPlan {
  strategy: string;
  focus: string[];
  entries: MethodologyPlanEntry[];
  notes: string;
}

// ── Cross-validation & critique ──────────────────────────────────────────

export interface Disagreement {
  id: string;
  topic: string;
  /** Methodology ids that disagree. */
  parties: string[];
  values: { methodologyId: string; label: string; value: number }[];
  spreadRatio: number;    // max/min
  severity: RiskSeverity;
  rootCause: string;
  moreCredible: string;   // methodology id the critic trusts more, or "unresolved"
  explanation: string;
  missingInfo: string[];
}

export interface ReconciledValuation {
  range: ValuationRange;
  method: string;               // how the range was derived
  weights: { methodologyId: string; weight: number; rationale: string }[];
  excluded: { methodologyId: string; reason: string }[];
  spreadRatio: number;
  agreement: number;            // 0..1
  confidence: number;           // 0..1
  explanation: string;
  keyAssumptions: string[];
}

export type CriticVerdict = "pass" | "revise" | "insufficient_data";

export interface Critique {
  verdict: CriticVerdict;
  unsupportedAssumptions: { claim: string; why: string; methodologyId: string }[];
  contradictions: { statementA: string; statementB: string; why: string }[];
  redFlags: { title: string; detail: string; severity: RiskSeverity }[];
  biasChecks: string[];
  credibilityChecks: { topic: string; assessment: string; credible: boolean }[];
  missingInformation: GapItem[];
  /** Methodology ids the critic wants re-run, with what to change. */
  rerunRequests: { methodologyId: string; instruction: string }[];
  confidenceCeiling: number; // 0..1 — caps the final confidence
  summary: string;
}

// ── Final output ─────────────────────────────────────────────────────────

export type Recommendation = "strong_invest" | "invest" | "consider" | "watch" | "pass";

export const RECOMMENDATIONS: Recommendation[] = [
  "strong_invest", "invest", "consider", "watch", "pass",
];

export interface ScoredSection {
  key: string;
  title: string;
  score10: number;
  confidence: number;
  narrative: string;
  evidence: string[];
  keyAssumptions: string[];
  missingInformation: string[];
}

export interface Scenario {
  label: string;
  narrative: string;
  probability: number;      // 0..1
  valuationUsd: number | null;
  drivers: string[];
}

export interface InvestmentThesis {
  executiveSummary: string;
  thesis: string;
  sections: ScoredSection[];
  valuation: {
    reconciled: ReconciledValuation;
    perMethodology: { methodologyId: string; name: string; range: ValuationRange | null; confidence: number }[];
    keyAssumptions: string[];
  };
  risks: RiskItem[];
  missingInformation: GapItem[];
  methodologySelectionExplanation: { methodologyId: string; name: string; reason: string; used: boolean }[];
  confidence: {
    overall: number;
    evidenceQuality: number;
    coverage: number;         // share of planned methodologies that completed
    drivers: string[];
    caveats: string[];
  };
  bullCase: Scenario;
  baseCase: Scenario;
  bearCase: Scenario;
  recommendation: Recommendation;
  recommendationReasoning: string;
  incompleteAnalysis: { methodologyId: string; reason: string }[];
}

// ── Session / observability ──────────────────────────────────────────────

export type SessionMode = "autonomous" | "guided" | "manual";

export type SessionStatus =
  | "draft" | "queued" | "running" | "waiting_for_input" | "completed" | "failed";

export type AgentRunStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export interface AgentRun {
  id: string;
  sessionId: string;
  agent: string;
  methodologyId: string | null;
  label: string;
  status: AgentRunStatus;
  iteration: number;
  input: unknown;
  output: unknown;
  confidence: number | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}

export interface AnalysisSession {
  id: string;
  userId: string | null;
  startupName: string;
  mode: SessionMode;
  status: SessionStatus;
  inputBundle: InputBundle;
  profile: StartupProfile | null;
  plan: AnalysisPlan | null;
  results: Record<string, MethodologyResult>;
  disagreements: Disagreement[];
  reconciled: ReconciledValuation | null;
  critique: Critique | null;
  thesis: InvestmentThesis | null;
  runs: AgentRun[];
  iteration: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
