"""Domain models exchanged between agents, and with the frontend.

Agents never hand each other prose — they hand each other these structures.
That is what makes cross-validation, confidence scoring and traceability
possible at all.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

StartupStage = Literal["idea", "pre_seed", "seed", "series_a", "growth"]
STARTUP_STAGES: list[str] = ["idea", "pre_seed", "seed", "series_a", "growth"]

INDUSTRY_TAGS: list[str] = [
    "saas", "deeptech", "hardware", "biotech", "healthtech", "fintech",
    "marketplace", "consumer", "ecommerce", "ai", "climate", "industrial",
    "gaming", "edtech", "other",
]

SourceType = Literal["provided", "derived", "inferred", "absent"]
RiskSeverity = Literal["low", "medium", "high", "critical"]
MethodologyFamily = Literal[
    "valuation", "readiness", "business_model", "market",
    "financial", "competitive", "risk", "team", "traction",
]
MethodologyStatus = Literal["queued", "running", "completed", "failed", "skipped", "insufficient_input"]
Recommendation = Literal["strong_invest", "invest", "consider", "watch", "pass"]
RECOMMENDATIONS: list[str] = ["strong_invest", "invest", "consider", "watch", "pass"]


class Evidence(BaseModel):
    """The unit of accountability: no material claim without one of these."""

    id: str = ""
    claim: str
    evidence: str = ""
    source: str = "unspecified"
    sourceType: SourceType = "inferred"
    confidence: float = 0.5
    methodology: str = ""
    reasoning: str = ""


class Risk(BaseModel):
    id: str = ""
    category: str = "general"
    title: str
    description: str = ""
    severity: RiskSeverity = "medium"
    likelihood: float = 0.5
    mitigation: str = ""
    evidence: list[str] = Field(default_factory=list)
    source: str = ""


class Gap(BaseModel):
    field: str
    why: str = ""
    blocks: list[str] = Field(default_factory=list)
    question: str = ""


class ValuationRange(BaseModel):
    low: float = 0
    point: float = 0
    high: float = 0
    currency: Literal["USD"] = "USD"


class ComputeOutput(BaseModel):
    """Result of a methodology's deterministic step."""

    valuation: Optional[ValuationRange] = None
    score10: Optional[float] = None
    computed: dict[str, Any] = Field(default_factory=dict)
    confidencePenalty: float = 0.0
    notes: list[str] = Field(default_factory=list)


class MethodologyResult(BaseModel):
    """`inputs` are what the agent assigned; `computed` is what the platform
    derived from them. The model never invents a valuation."""

    methodologyId: str
    name: str
    family: MethodologyFamily
    status: MethodologyStatus = "queued"
    headline: str = ""
    valuation: Optional[ValuationRange] = None
    score10: Optional[float] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    computed: dict[str, Any] = Field(default_factory=dict)
    reasoning: str = ""
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    missingInputs: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    confidence: float = 0.0
    error: Optional[str] = None
    durationMs: Optional[int] = None


# ── Startup understanding ────────────────────────────────────────────────


class BusinessModel(BaseModel):
    type: str = "not stated"
    revenueModel: str = "not stated"
    pricing: str = "not stated"
    customerType: str = "not stated"
    unitEconomicsKnown: bool = False
    notes: str = ""


class Market(BaseModel):
    description: str = "not stated"
    tam: Optional[float] = None
    sam: Optional[float] = None
    som: Optional[float] = None
    growthRatePct: Optional[float] = None
    sizingBasis: str = "not shown"
    notes: str = ""


class Product(BaseModel):
    description: str = "not stated"
    maturity: str = "not stated"
    differentiation: str = "not stated"
    notes: str = ""


class Technology(BaseModel):
    description: str = "not stated"
    coreTech: str = "not stated"
    trlEstimate: Optional[float] = None
    ipPosition: str = "none stated"
    technicalRisk: str = ""
    notes: str = ""


class Team(BaseModel):
    size: Optional[float] = None
    founders: str = "not stated"
    domainExpertise: str = "not stated"
    gaps: str = ""
    notes: str = ""


class Traction(BaseModel):
    customers: Optional[float] = None
    revenueUsd: Optional[float] = None
    growthNote: str = ""
    pilots: str = ""
    notes: str = ""


class Competition(BaseModel):
    landscape: str = "not stated"
    namedCompetitors: list[str] = Field(default_factory=list)
    defensibility: str = "not stated"
    notes: str = ""


class Financials(BaseModel):
    monthlyBurnUsd: Optional[float] = None
    runwayMonths: Optional[float] = None
    grossMarginPct: Optional[float] = None
    churnRatePct: Optional[float] = None
    notes: str = ""


class Fundraising(BaseModel):
    seeking: Optional[float] = None
    instrument: str = "not stated"
    useOfFunds: str = ""
    notes: str = ""


class StartupProfile(BaseModel):
    name: str = "Unnamed startup"
    oneLiner: str = "Not stated in the supplied material."
    stage: StartupStage = "pre_seed"
    stageRationale: str = ""
    industries: list[str] = Field(default_factory=lambda: ["other"])
    geography: str = "not stated"
    businessModel: BusinessModel = Field(default_factory=BusinessModel)
    market: Market = Field(default_factory=Market)
    product: Product = Field(default_factory=Product)
    technology: Technology = Field(default_factory=Technology)
    team: Team = Field(default_factory=Team)
    traction: Traction = Field(default_factory=Traction)
    competition: Competition = Field(default_factory=Competition)
    financials: Financials = Field(default_factory=Financials)
    fundraising: Fundraising = Field(default_factory=Fundraising)
    riskFlags: list[str] = Field(default_factory=list)
    dataGaps: list[Gap] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    evidenceQuality: float = 0.0


# ── Inputs ───────────────────────────────────────────────────────────────


class ManualAnswers(BaseModel):
    """What the founder already filled in elsewhere in InvestVCS."""

    berkusAnswers: list[Optional[float]] = Field(default_factory=list)
    scorecardAnswers: list[Optional[float]] = Field(default_factory=list)
    scorecardMedian: float = 0
    riskAnswers: list[Optional[float]] = Field(default_factory=list)
    vcAnswers: Optional[dict[str, Any]] = None
    chicagoAnswers: Optional[dict[str, Any]] = None
    trlAnswers: dict[str, bool] = Field(default_factory=dict)
    crlAnswers: dict[str, bool] = Field(default_factory=dict)
    frlAnswers: dict[str, bool] = Field(default_factory=dict)


class InputBundle(BaseModel):
    startupName: str = ""
    narrative: str = ""
    pitchDeckText: str = ""
    pitchDeckFileName: str = ""
    bmc: dict[str, str] = Field(default_factory=dict)
    financialSnapshot: Optional[dict[str, Any]] = None
    financialHistory: list[dict[str, Any]] = Field(default_factory=list)
    manual: ManualAnswers = Field(default_factory=ManualAnswers)
    corrections: dict[str, Any] = Field(default_factory=dict)
    gapAnswers: dict[str, str] = Field(default_factory=dict)


# ── Planning ─────────────────────────────────────────────────────────────


class PlanEntry(BaseModel):
    methodologyId: str
    selected: bool = False
    reason: str = ""
    priority: int = 50
    expectedConfidence: float = 0.0
    gatedOut: Optional[str] = None


class AnalysisPlan(BaseModel):
    strategy: str = ""
    focus: list[str] = Field(default_factory=list)
    entries: list[PlanEntry] = Field(default_factory=list)
    notes: str = ""

    def selected_ids(self) -> list[str]:
        return [entry.methodologyId for entry in self.entries if entry.selected]


# ── Cross-validation ─────────────────────────────────────────────────────


class DisagreementValue(BaseModel):
    methodologyId: str
    label: str
    value: float


class Disagreement(BaseModel):
    id: str
    topic: str
    parties: list[str] = Field(default_factory=list)
    values: list[DisagreementValue] = Field(default_factory=list)
    spreadRatio: float = 0
    severity: RiskSeverity = "medium"
    rootCause: str = ""
    moreCredible: str = "unresolved"
    explanation: str = ""
    missingInfo: list[str] = Field(default_factory=list)


class WeightEntry(BaseModel):
    methodologyId: str
    weight: float
    rationale: str = ""


class ExclusionEntry(BaseModel):
    methodologyId: str
    reason: str


class ReconciledValuation(BaseModel):
    range: ValuationRange = Field(default_factory=ValuationRange)
    method: str = ""
    weights: list[WeightEntry] = Field(default_factory=list)
    excluded: list[ExclusionEntry] = Field(default_factory=list)
    spreadRatio: float = 1
    agreement: float = 0
    confidence: float = 0
    explanation: str = ""
    keyAssumptions: list[str] = Field(default_factory=list)


class UnsupportedAssumption(BaseModel):
    claim: str
    why: str = ""
    methodologyId: str = "unknown"


class Contradiction(BaseModel):
    statementA: str
    statementB: str = ""
    why: str = ""


class RedFlag(BaseModel):
    title: str
    detail: str = ""
    severity: RiskSeverity = "medium"


class CredibilityCheck(BaseModel):
    topic: str
    assessment: str = ""
    credible: bool = False


class RerunRequest(BaseModel):
    methodologyId: str
    instruction: str = ""


class Critique(BaseModel):
    verdict: Literal["pass", "revise", "insufficient_data"] = "pass"
    summary: str = ""
    unsupportedAssumptions: list[UnsupportedAssumption] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)
    redFlags: list[RedFlag] = Field(default_factory=list)
    biasChecks: list[str] = Field(default_factory=list)
    credibilityChecks: list[CredibilityCheck] = Field(default_factory=list)
    missingInformation: list[Gap] = Field(default_factory=list)
    rerunRequests: list[RerunRequest] = Field(default_factory=list)
    confidenceCeiling: float = 0.85


# ── Final output ─────────────────────────────────────────────────────────


class ScoredSection(BaseModel):
    key: str
    title: str
    score10: float = 0
    confidence: float = 0.5
    narrative: str = ""
    evidence: list[str] = Field(default_factory=list)
    keyAssumptions: list[str] = Field(default_factory=list)
    missingInformation: list[str] = Field(default_factory=list)


class Scenario(BaseModel):
    label: str
    narrative: str = ""
    probability: float = 0.33
    valuationUsd: Optional[float] = None
    drivers: list[str] = Field(default_factory=list)


class PerMethodologyValuation(BaseModel):
    methodologyId: str
    name: str
    range: Optional[ValuationRange] = None
    confidence: float = 0


class ValuationSummary(BaseModel):
    reconciled: ReconciledValuation = Field(default_factory=ReconciledValuation)
    perMethodology: list[PerMethodologyValuation] = Field(default_factory=list)
    keyAssumptions: list[str] = Field(default_factory=list)


class SelectionExplanation(BaseModel):
    methodologyId: str
    name: str
    reason: str
    used: bool


class ConfidenceReport(BaseModel):
    overall: float = 0
    evidenceQuality: float = 0
    coverage: float = 0
    drivers: list[str] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)


class IncompleteEntry(BaseModel):
    methodologyId: str
    reason: str


class InvestmentThesis(BaseModel):
    executiveSummary: str = ""
    thesis: str = ""
    sections: list[ScoredSection] = Field(default_factory=list)
    valuation: ValuationSummary = Field(default_factory=ValuationSummary)
    risks: list[Risk] = Field(default_factory=list)
    missingInformation: list[Gap] = Field(default_factory=list)
    methodologySelectionExplanation: list[SelectionExplanation] = Field(default_factory=list)
    confidence: ConfidenceReport = Field(default_factory=ConfidenceReport)
    bullCase: Scenario = Field(default_factory=lambda: Scenario(label="Bull"))
    baseCase: Scenario = Field(default_factory=lambda: Scenario(label="Base"))
    bearCase: Scenario = Field(default_factory=lambda: Scenario(label="Bear"))
    recommendation: Recommendation = "consider"
    recommendationReasoning: str = ""
    incompleteAnalysis: list[IncompleteEntry] = Field(default_factory=list)


# ── Requests ─────────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    bundle: InputBundle
    mode: Literal["autonomous", "guided", "manual"] = "autonomous"
    chosenMethodologyIds: list[str] = Field(default_factory=list)
    maxIterations: Optional[int] = None
    sessionId: Optional[str] = None


class CompareRequest(BaseModel):
    a: dict[str, Any]
    b: dict[str, Any]
