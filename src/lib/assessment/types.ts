// Core types for the evidence-based assessment system.
//
// The design rule this file encodes: a founder never states a valuation
// variable. They answer observable questions about what has actually
// happened, each answer carries an evidence class, and the engine derives the
// variables. Nothing downstream reads a number the founder typed as a score.
//
// Everything is data. Adding a methodology, a factor or a question means
// adding a config entry, not editing the engine.

/* ── Evidence ─────────────────────────────────────────────────────────── */

/**
 * Where an answer's support comes from. This is deliberately about the
 * *source*, not the content: "we have 400 paying customers" backed by a
 * billing export is a different claim from the same sentence backed by memory.
 */
export type EvidenceStrength =
  | "verified"       // third-party or system-of-record (billing, contracts, official stats)
  | "documented"     // internal record exists (analytics, signed LOI, research report)
  | "self_reported"  // founder's direct observation, undocumented
  | "estimated"      // founder's inference or extrapolation
  | "absent";        // not answered / no basis

export const EVIDENCE_WEIGHT: Record<EvidenceStrength, number> = {
  verified: 1,
  documented: 0.85,
  self_reported: 0.55,
  estimated: 0.3,
  absent: 0,
};

export const EVIDENCE_LABEL: Record<EvidenceStrength, string> = {
  verified: "Verified",
  documented: "Documented",
  self_reported: "Self-reported",
  estimated: "Estimated",
  absent: "Not provided",
};

/* ── Stage ────────────────────────────────────────────────────────────── */

export type StageKey = "idea" | "prototype" | "mvp" | "revenue" | "scaling";

export interface StageConfig {
  key: StageKey;
  label: string;
  description: string;
  /** Ordering, so the engine can ask "is this at least stage X?". */
  rank: number;
}

/* ── Factors ──────────────────────────────────────────────────────────── */

export type FactorKey =
  | "team" | "market" | "product" | "technology" | "traction"
  | "competition" | "gtm" | "financial" | "relationships";

export interface FactorConfig {
  key: FactorKey;
  label: string;
  /** What the factor claims to measure, shown in the explainer. */
  definition: string;
  /** Weight in the overall score, per stage. `default` is the fallback. */
  overallWeight: Partial<Record<StageKey, number>> & { default: number };
}

/* ── Questions ────────────────────────────────────────────────────────── */

export type SectionKey =
  | "company" | "team" | "market" | "product" | "traction"
  | "gtm" | "competition" | "financials" | "risk";

export interface SectionConfig {
  key: SectionKey;
  label: string;
  /** The line the analyst opens this section with. */
  intro: string;
  order: number;
}

export type QuestionKind = "single" | "multi" | "number" | "rank";

/** Facts an answer puts on the record. Read by contradiction rules and gates. */
export type SignalValue = number | string | boolean;
export type SignalState = Record<string, SignalValue>;

export interface AnswerOption {
  id: string;
  label: string;
  /** Optional clarifier under the option. Never contains the score. */
  detail?: string;
  /** 0..1. Never rendered to the founder while answering. */
  score: number;
  /** Overrides the question's evidence class — some answers date themselves. */
  evidence?: EvidenceStrength;
  /** Facts this answer asserts. */
  signals?: SignalState;
}

export interface NumericBucket {
  /** Inclusive upper bound; the last bucket should use Infinity. */
  max: number;
  score: number;
  label: string;
}

export interface Question {
  id: string;
  section: SectionKey;
  kind: QuestionKind;
  /** The question as the analyst asks it. Observable, not evaluative. */
  prompt: string;
  /** One line of context: why this is being asked. */
  helper?: string;
  /** Evidence class for the answer unless an option overrides it. */
  evidence: EvidenceStrength;
  /** How the answer feeds the derived factors. Weights are relative. */
  contributes: { factor: FactorKey; weight: number }[];
  options?: AnswerOption[];
  /** For `multi`. */
  multi?: {
    /** Selecting this option id clears every other — a "none of these" escape. */
    noneOption?: string;
  };
  /** For `number`. */
  numeric?: {
    unit: string;
    placeholder?: string;
    min?: number;
    max?: number;
    /** Buckets the raw figure into a 0..1 score. */
    buckets: NumericBucket[];
    /** Signal key the raw figure is recorded under. */
    signal: string;
  };
  /** For `rank`: the founder orders these; scoring reads the ordering. */
  rank?: {
    items: { id: string; label: string }[];
    /** Score for each item by the position it lands in. Index = position. */
    positionScores: Record<string, number[]>;
  };
  /** Asked only when this returns true. Absent means "always ask". */
  when?: (state: SignalState) => boolean;
  /** Part of the always-asked core set — the questionnaire's spine. */
  core?: boolean;
  /**
   * Cross-validation group. Questions sharing a probe measure the same
   * underlying thing from different angles; the engine compares them.
   */
  probe?: string;
  /** Relative weight inside its factors. Default 1. */
  weight?: number;
}

/* ── Answers ──────────────────────────────────────────────────────────── */

export interface Answer {
  questionId: string;
  /** Option ids for single/multi, ordered item ids for rank. */
  selected?: string[];
  /** Raw figure for `number`. */
  value?: number;
  answeredAt: string;
}

export type AnswerMap = Record<string, Answer>;

/* ── Derived scores ───────────────────────────────────────────────────── */

/** One answered question's contribution to a factor — the explainer's row. */
export interface Contribution {
  questionId: string;
  prompt: string;
  answerLabel: string;
  /** 0..1 */
  score: number;
  weight: number;
  evidence: EvidenceStrength;
}

export interface FactorScore {
  key: FactorKey;
  label: string;
  definition: string;
  /** 0..100 — straight reading of the answers. */
  raw: number;
  /**
   * 0..100 — raw pulled toward the neutral prior in proportion to how weak
   * the evidence is. This is what the methodologies consume.
   */
  adjusted: number;
  /** 0..1 */
  confidence: number;
  /** 0..1 — mean evidence weight behind the answers. */
  evidenceQuality: number;
  /** 0..1 — share of applicable question weight actually answered. */
  coverage: number;
  /** 0..1 — agreement between cross-validating questions. 1 when untested. */
  consistency: number;
  contributions: Contribution[];
  /** Questions that would raise confidence most if answered. */
  unanswered: string[];
}

export type FactorScores = Record<FactorKey, FactorScore>;

/* ── Contradictions ───────────────────────────────────────────────────── */

export type ContradictionSeverity = "low" | "medium" | "high";

export interface Contradiction {
  ruleId: string;
  title: string;
  /** Plain-language statement of the conflict, quoting both sides. */
  message: string;
  severity: ContradictionSeverity;
  /** Questions involved, so the UI can offer "revisit this answer". */
  questionIds: string[];
  /** The question to put to the founder to settle it. */
  clarification: string;
  /** Factors whose confidence this dents. */
  affects: FactorKey[];
  /** 0..1 multiplier applied to those factors' confidence. */
  penalty: number;
}

export interface ContradictionRule {
  id: string;
  title: string;
  severity: ContradictionSeverity;
  affects: FactorKey[];
  penalty: number;
  detect: (ctx: {
    signals: SignalState;
    answers: AnswerMap;
    answerLabel: (questionId: string) => string;
  }) => { message: string; questionIds: string[]; clarification: string } | null;
}

/** A contradiction the founder has responded to. */
export interface Resolution {
  ruleId: string;
  /** "corrected" — an answer was changed.
   *  "explained" — both answers stand, with a reason. */
  outcome: "corrected" | "explained";
  note?: string;
  resolvedAt: string;
}

/* ── Methodologies ────────────────────────────────────────────────────── */

export type MethodologyStatus = "computed" | "insufficient_input" | "not_applicable";

export interface ValuationRange {
  low: number;
  point: number;
  high: number;
}

/** One line of a methodology's own breakdown — a Berkus bar, a Scorecard row. */
export interface MethodologyComponent {
  key: string;
  label: string;
  /** 0..1 — the derived component strength. */
  score: number;
  /** Rendered value: a dollar contribution, a percentage, a grid position. */
  display: string;
  /**
   * The method's own native number behind `display` — a Berkus grid position,
   * a Scorecard comparison percentage, a Risk Factor step. Kept unrounded so
   * the analyst bridge can hand the published methodologies their inputs
   * without parsing a formatted string back into a number.
   */
  raw?: number;
  /** Contribution to the output, for the waterfall. */
  contribution?: number;
  weight?: number;
  /** Derived factors that fed this component, for the evidence trail. */
  from: FactorKey[];
  rationale: string;
}

export interface MethodologyOutcome {
  id: string;
  name: string;
  purpose: string;
  status: MethodologyStatus;
  /** Present only when status is "computed". */
  range?: ValuationRange;
  /** 0..1 */
  confidence: number;
  components: MethodologyComponent[];
  assumptions: string[];
  limitations: string[];
  /** Why it did not run, when it did not. */
  reason?: string;
  /** One sentence a founder can read on its own. */
  headline: string;
}

export interface ValuationContext {
  factors: FactorScores;
  signals: SignalState;
  stage: StageKey;
  /** Overall evidence quality, 0..1. */
  evidenceQuality: number;
  /** Share of the applicable questions answered, 0..1. Methods refuse to
   *  produce a figure below a floor — a neutral factor is an unasked
   *  question, not an average company. */
  coverage: number;
  /** Sector/region median pre-money used by the Scorecard family. */
  comparableMedian: number;
}

export interface MethodologyConfig {
  id: string;
  name: string;
  /** What question this methodology can actually answer. */
  purpose: string;
  /** Written for a founder, shown in the methodology map. */
  explanation: string;
  /** Ceiling on how far this method can be trusted alone. */
  baseConfidence: number;
  /** Stages at which the method is meaningful. */
  stages: StageKey[];
  /** Deterministic input gate. A string means "cannot run, because…". */
  gate?: (ctx: ValuationContext) => string | null;
  run: (ctx: ValuationContext) => Omit<MethodologyOutcome, "id" | "name" | "purpose" | "status">;
  limitations: string[];
}

/* ── Aggregate result ─────────────────────────────────────────────────── */

export interface DriverItem {
  label: string;
  detail: string;
  /** 0..1 — how much it moved the result. */
  impact: number;
  factor: FactorKey;
}

export interface RiskIndicator {
  id: string;
  title: string;
  detail: string;
  severity: ContradictionSeverity;
  factor?: FactorKey;
}

export interface GapItem {
  questionId: string;
  prompt: string;
  section: SectionKey;
  /** Factors that would firm up if this were answered. */
  affects: FactorKey[];
  /** 0..1 — expected confidence gain. */
  value: number;
}

export interface BlendWeight {
  methodologyId: string;
  name: string;
  weight: number;
  rationale: string;
}

export interface AssessmentResult {
  /** 0..100 — confidence-adjusted composite. */
  overallScore: number;
  /** 0..100 — before the confidence haircut, for the honest comparison. */
  rawScore: number;
  confidence: number;
  evidenceQuality: number;
  coverage: number;
  riskLevel: "low" | "moderate" | "elevated" | "high";
  stage: StageKey;
  /** Blended range across methodologies. */
  valuation: ValuationRange;
  blend: {
    weights: BlendWeight[];
    excluded: { methodologyId: string; name: string; reason: string }[];
    /** max/min across the contributing point estimates. */
    spread: number;
    /** 0..1 — how closely the methods agree. */
    agreement: number;
  };
  methodologies: MethodologyOutcome[];
  factors: FactorScore[];
  strengths: DriverItem[];
  weaknesses: DriverItem[];
  risks: RiskIndicator[];
  contradictions: Contradiction[];
  gaps: GapItem[];
  /** True while an unresolved high-severity contradiction stands. */
  provisional: boolean;
  scenarios: {
    key: "bear" | "base" | "bull";
    label: string;
    valuation: number;
    narrative: string;
    assumptions: string[];
  }[];
}

/* ── Session ──────────────────────────────────────────────────────────── */

export interface AssessmentSession {
  id: string;
  startupName: string;
  answers: AnswerMap;
  resolutions: Record<string, Resolution>;
  /** Question ids in the order they were served, so Back is faithful. */
  history: string[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}
