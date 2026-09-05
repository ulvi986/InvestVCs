import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import AgentInspector from "@/components/analyst/AgentInspector";
import AgentGraph from "@/components/analyst/AgentGraph";
import CriticPanel from "@/components/analyst/CriticPanel";
import InvestmentReport from "@/components/analyst/InvestmentReport";
import MethodologyResults from "@/components/analyst/MethodologyResults";
import PlanPanel from "@/components/analyst/PlanPanel";
import ValuationPanel from "@/components/analyst/ValuationPanel";
import ProfilePanel from "@/components/analyst/ProfilePanel";

import { thesisToMarkdown } from "@/lib/analyst/report";
import { METHODOLOGY_META } from "@/lib/analyst/registry";
import type {
  AnalysisPlan, Critique, Disagreement, InvestmentThesis, MethodologyResult, ReconciledValuation,
} from "@/lib/analyst/types";
import type { AgentGraphData } from "@/lib/analyst/graphTypes";
import { makeProfile, makeResult, range } from "./helpers";

const profile = makeProfile();

// Reconciliation and planning now happen in the Python service, so the UI is
// tested against the payloads it actually receives over the wire.
const plan: AnalysisPlan = {
  strategy: "SaaS-weighted: market, retention and unit economics.",
  focus: ["market", "unit economics"],
  notes: "",
  entries: METHODOLOGY_META.map((meta) => ({
    methodologyId: meta.id,
    selected: ["berkus", "scorecard", "vc_method", "market_analysis", "risk_analysis"].includes(meta.id),
    reason: `Reason for ${meta.name} on this company.`,
    priority: 20,
    expectedConfidence: 0.7,
    gatedOut: meta.id === "first_chicago" ? "No revenue base to differentiate scenarios." : undefined,
  })),
};

const results: Record<string, MethodologyResult> = {
  berkus: makeResult("berkus", {
    name: "Berkus Method",
    family: "valuation",
    headline: "Berkus: $1,250,000",
    valuation: range(1_000_000, 1_250_000, 1_500_000),
    confidence: 0.66,
    reasoning: "Prototype and team are evidenced; traction is thin.",
    inputs: { components: { team: { score: 4, justification: "Two technical founders" } } },
    computed: { totalUsd: 1_250_000, capUsd: 2_500_000, platformNotes: ["One component was scored without a justification."] },
    assumptions: ["The prototype demo reflects production capability."],
    missingInputs: ["Strategic partnerships"],
    evidence: [{
      id: "e1", claim: "Two technical founders with ten years in the sector",
      evidence: "Slide 9 lists both founders' backgrounds", source: "pitch_deck: slide 9",
      sourceType: "provided", confidence: 0.9, methodology: "berkus", reasoning: "Stated directly",
    }],
    risks: [{
      id: "r1", category: "team", title: "No sales leadership", description: "The team has no go-to-market hire.",
      severity: "medium", likelihood: 0.5, mitigation: "Hire a sales lead", evidence: ["Slide 9"], source: "berkus",
    }],
  }),
  scorecard: makeResult("scorecard", {
    name: "Scorecard Method",
    family: "valuation",
    headline: "Scorecard: $3,000,000",
    valuation: range(2_400_000, 3_000_000, 3_800_000),
    confidence: 0.7,
  }),
  vc_method: makeResult("vc_method", {
    name: "VC Method",
    family: "valuation",
    status: "insufficient_input",
    headline: "VC Method: no conclusion",
    confidence: 0,
    computed: { platformNotes: ["No credible exit-year revenue projection was available."] },
  }),
  market_analysis: makeResult("market_analysis", {
    name: "Market Analysis", family: "market", score10: 8.2, confidence: 0.72,
    headline: "Attractive but narrower than claimed.",
  }),
  risk_analysis: makeResult("risk_analysis", {
    name: "Risk Analysis", family: "risk", status: "failed",
    error: "Rate limit reached.", headline: "Risk Analysis did not complete.", confidence: 0,
  }),
};

const disagreements: Disagreement[] = [{
  id: "valuation-spread",
  topic: "Valuation",
  parties: ["berkus", "scorecard"],
  values: [
    { methodologyId: "berkus", label: "Berkus Method", value: 1_250_000 },
    { methodologyId: "scorecard", label: "Scorecard Method", value: 3_000_000 },
  ],
  spreadRatio: 2.4,
  severity: "medium",
  rootCause: "The comparables median Scorecard uses is far above what Berkus can reach at its cap.",
  moreCredible: "scorecard",
  explanation: "Scorecard is anchored to observed seed rounds; Berkus is capped at $2.5M by construction.",
  missingInfo: ["Audited revenue"],
}];

const reconciled: ReconciledValuation = {
  range: range(1_000_000, 1_940_000, 3_800_000),
  method: "Confidence-weighted geometric mean of the methodologies that survived cross-validation.",
  weights: [
    { methodologyId: "berkus", weight: 0.48, rationale: "Registry base confidence × the agent's confidence." },
    { methodologyId: "scorecard", weight: 0.52, rationale: "Registry base confidence × the agent's confidence." },
  ],
  excluded: [{ methodologyId: "vc_method", reason: "No credible revenue projection." }],
  spreadRatio: 2.4,
  agreement: 0.62,
  confidence: 0.51,
  explanation: "The range is set by the comparables anchor, not by averaging the two methods.",
  keyAssumptions: ["EU seed comparables hold"],
};

const critique: Critique = {
  verdict: "revise",
  summary: "The market sizing is asserted rather than derived, and traction does not support the ask.",
  unsupportedAssumptions: [{ claim: "TAM of $5B", why: "No derivation was shown.", methodologyId: "market_analysis" }],
  contradictions: [{ statementA: "24 paying customers", statementB: "Pre-revenue", why: "Both cannot hold." }],
  redFlags: [{ title: "Revenue claim contradicts the financials", detail: "Slide 12 vs the snapshot.", severity: "critical" }],
  biasChecks: ["The analysis may over-weight the founders' technical credibility."],
  credibilityChecks: [{ topic: "Market size", assessment: "Not derivable from the material.", credible: false }],
  missingInformation: [{
    field: "Audited financials", why: "Revenue is unverified.",
    blocks: ["vc_method"], question: "Can you share audited accounts?",
  }],
  rerunRequests: [{ methodologyId: "scorecard", instruction: "Re-derive the comparables median." }],
  confidenceCeiling: 0.62,
};

const thesis: InvestmentThesis = {
  executiveSummary: "A seed-stage SaaS company with real but early traction and an unverified market claim.",
  thesis: "The bet is that workflow lock-in converts into net revenue retention.",
  sections: [{
    key: "market", title: "Market Opportunity", score10: 8.2, confidence: 0.72,
    narrative: "The market is attractive but narrower than the deck claims.",
    evidence: ["24 paying customers"], keyAssumptions: ["Procurement budgets hold"], missingInformation: ["Bottom-up sizing"],
  }],
  valuation: {
    reconciled,
    perMethodology: [
      { methodologyId: "berkus", name: "Berkus Method", range: range(1_000_000, 1_250_000, 1_500_000), confidence: 0.66 },
      { methodologyId: "scorecard", name: "Scorecard Method", range: range(2_400_000, 3_000_000, 3_800_000), confidence: 0.7 },
      { methodologyId: "vc_method", name: "VC Method", range: null, confidence: 0 },
    ],
    keyAssumptions: ["EU seed comparables hold"],
  },
  risks: [results.berkus.risks[0]],
  missingInformation: critique.missingInformation,
  methodologySelectionExplanation: [
    { methodologyId: "berkus", name: "Berkus Method", reason: "Pre-revenue de-risking is the right lens here.", used: true },
    { methodologyId: "first_chicago", name: "First Chicago Method", reason: "No revenue base to differentiate scenarios.", used: false },
  ],
  confidence: {
    overall: 0.54, evidenceQuality: 0.61, coverage: 0.8,
    drivers: ["4 of 5 planned methodologies completed."],
    caveats: ["Risk Analysis did not complete: Rate limit reached."],
  },
  bullCase: { label: "Bull", narrative: "Retention holds above 110%.", probability: 0.2, valuationUsd: 5_000_000, drivers: ["Expansion revenue"] },
  baseCase: { label: "Base", narrative: "Steady growth at current efficiency.", probability: 0.6, valuationUsd: 3_000_000, drivers: ["Current pipeline"] },
  bearCase: { label: "Bear", narrative: "Churn rises as the free pilots convert poorly.", probability: 0.2, valuationUsd: 900_000, drivers: ["Pilot conversion"] },
  recommendation: "consider",
  recommendationReasoning: "Traction is real but thin relative to the ask, and the market claim is unverified.",
  incompleteAnalysis: [{ methodologyId: "risk_analysis", reason: "Rate limit reached." }],
};

const UNUSED_RUNS = [
  { id: "1", sessionId: "s", agent: "understand", methodologyId: null, label: "Startup understanding", status: "completed", iteration: 0, input: null, output: null, confidence: 0.7, error: null, startedAt: "2026-09-01T00:00:00Z", finishedAt: "2026-09-01T00:00:04Z", durationMs: 4200 },
  { id: "2", sessionId: "s", agent: "select", methodologyId: null, label: "Methodology selection", status: "completed", iteration: 0, input: null, output: null, confidence: null, error: null, startedAt: "2026-09-01T00:00:04Z", finishedAt: "2026-09-01T00:00:07Z", durationMs: 3100 },
  { id: "3", sessionId: "s", agent: "methodology:berkus", methodologyId: "berkus", label: "Berkus Method", status: "completed", iteration: 0, input: null, output: null, confidence: 0.66, error: null, startedAt: "2026-09-01T00:00:07Z", finishedAt: "2026-09-01T00:00:12Z", durationMs: 5000 },
  { id: "4", sessionId: "s", agent: "methodology:risk_analysis", methodologyId: "risk_analysis", label: "Risk Analysis", status: "failed", iteration: 0, input: null, output: null, confidence: null, error: "Rate limit reached.", startedAt: "2026-09-01T00:00:07Z", finishedAt: "2026-09-01T00:00:09Z", durationMs: 2000 },
  { id: "5", sessionId: "s", agent: "critic", methodologyId: null, label: "Cross-validation & critique", status: "running", iteration: 1, input: null, output: null, confidence: null, error: null, startedAt: "2026-09-01T00:00:12Z", finishedAt: null, durationMs: null },
];

const graph: AgentGraphData = {
  nodes: [
    { id: "input", label: "Startup input", kind: "input", layer: 0, status: "completed", detail: "", family: null, confidence: null, durationMs: null, iteration: 0, error: null, headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "understand", label: "Startup understanding", kind: "understand", layer: 1, status: "completed", detail: "seed · saas", family: null, confidence: 0.7, durationMs: 4200, iteration: 0, error: null, headline: "Test Co", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "select", label: "Methodology selection", kind: "planner", layer: 2, status: "completed", detail: "", family: null, confidence: null, durationMs: 3100, iteration: 0, error: null, headline: "5 methodologies", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "methodology:berkus", label: "Berkus Method", kind: "methodology", layer: 3, status: "completed", detail: "", family: "valuation", confidence: 0.66, durationMs: 5000, iteration: 0, error: null, headline: "$1,250,000", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "methodology:risk_analysis", label: "Risk Analysis", kind: "methodology", layer: 3, status: "failed", detail: "Did not complete", family: "risk", confidence: null, durationMs: 2000, iteration: 0, error: "Rate limit reached.", headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "methodology:first_chicago", label: "First Chicago Method", kind: "methodology", layer: 3, status: "skipped", detail: "No revenue base.", family: "valuation", confidence: null, durationMs: null, iteration: 0, error: null, headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "critic", label: "Cross-validation & critique", kind: "critic", layer: 4, status: "running", detail: "Challenging the conclusions", family: null, confidence: null, durationMs: null, iteration: 1, error: null, headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "reconcile", label: "Valuation reconciliation", kind: "reconcile", layer: 5, status: "idle", detail: "", family: null, confidence: null, durationMs: null, iteration: 0, error: null, headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "synthesis", label: "Investment thesis", kind: "synthesis", layer: 6, status: "idle", detail: "", family: null, confidence: null, durationMs: null, iteration: 0, error: null, headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
    { id: "report", label: "Investment report", kind: "report", layer: 7, status: "idle", detail: "", family: null, confidence: null, durationMs: null, iteration: 0, error: null, headline: "", tools: [], toolLabels: [], requiresApproval: false, rationale: "", summary: {} },
  ],
  edges: [
    { source: "input", target: "understand", kind: "flow" },
    { source: "understand", target: "select", kind: "flow" },
    { source: "select", target: "methodology:berkus", kind: "flow" },
    { source: "methodology:berkus", target: "critic", kind: "flow" },
    { source: "critic", target: "reconcile", kind: "flow" },
    { source: "reconcile", target: "synthesis", kind: "flow" },
    { source: "synthesis", target: "report", kind: "flow" },
    { source: "critic", target: "select", kind: "feedback" },
  ],
};

describe("agent graph", () => {
  it("draws every stage, including the ones not yet started", () => {
    render(<AgentGraph graph={graph} statusMessage="Cross-validating" running />);
    expect(screen.getByText("Startup understanding")).toBeInTheDocument();
    expect(screen.getByText("Berkus Method")).toBeInTheDocument();
    // Not yet run, but drawn so the pipeline shape is visible from the start.
    expect(screen.getByText("Investment thesis")).toBeInTheDocument();
    expect(screen.getByText("Cross-validating")).toBeInTheDocument();
  });

  it("marks a skipped methodology as not applied rather than hiding it", () => {
    render(<AgentGraph graph={graph} running />);
    expect(screen.getByText("First Chicago Method")).toBeInTheDocument();
    expect(screen.getByText("not applied")).toBeInTheDocument();
  });

  it("shows the headline figure a completed agent produced", () => {
    render(<AgentGraph graph={graph} running />);
    expect(screen.getByText("$1,250,000")).toBeInTheDocument();
  });

  it("labels each node for assistive technology", () => {
    render(<AgentGraph graph={graph} running />);
    expect(screen.getByLabelText("Berkus Method, done")).toBeInTheDocument();
    expect(screen.getByLabelText("Risk Analysis, failed")).toBeInTheDocument();
  });

  it("reports the selected node to the workspace, which owns the inspector", () => {
    const selected: string[] = [];
    const { getByLabelText } = render(
      <AgentGraph graph={graph} running onSelect={(node) => selected.push(node?.id ?? "none")} />,
    );
    getByLabelText("Risk Analysis, failed").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(selected).toEqual(["methodology:risk_analysis"]);
  });

  it("shows the failure reason in the inspector", () => {
    const failed = graph.nodes.find((node) => node.id === "methodology:risk_analysis")!;
    render(<AgentInspector node={failed} onClose={() => {}} />);
    expect(screen.getByText("Rate limit reached.")).toBeInTheDocument();
  });

  it("pauses visibly when the run is waiting on a person", () => {
    const waiting = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === "critic" ? { ...node, status: "awaiting_approval" as const } : node,
      ),
    };
    render(<AgentGraph graph={waiting} running />);
    expect(screen.getByLabelText("Cross-validation & critique, needs you")).toBeInTheDocument();
    expect(screen.getByText("Paused. The run is waiting on your decision.")).toBeInTheDocument();
  });

  it("renders nothing before the service has sent a graph", () => {
    const { container } = render(<AgentGraph graph={{ nodes: [], edges: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("valuation panel", () => {
  it("renders every estimate, the reconciled range and why they disagree", () => {
    render(<ValuationPanel results={results} reconciled={reconciled} disagreements={disagreements} />);
    expect(screen.getAllByText("Berkus Method").length).toBeGreaterThan(0);
    expect(screen.getByText("Why the methodologies disagree")).toBeInTheDocument();
    expect(screen.getByText(/not by averaging/)).toBeInTheDocument();
    expect(screen.getByText("How the range was weighted")).toBeInTheDocument();
    // The methodology that could not produce a number is named, not hidden.
    expect(screen.getByText("No valuation produced")).toBeInTheDocument();
    expect(screen.getAllByText(/VC Method/).length).toBeGreaterThan(0);
  });

  it("says so plainly when no valuation was possible", () => {
    render(<ValuationPanel results={{}} reconciled={null} disagreements={[]} />);
    expect(screen.getByText(/No valuation methodology was applied/)).toBeInTheDocument();
  });
});

describe("methodology results", () => {
  it("lists each methodology with its status and headline", () => {
    render(<MethodologyResults results={results} order={Object.keys(results)} />);
    expect(screen.getByText("Berkus Method")).toBeInTheDocument();
    expect(screen.getByText("Risk Analysis")).toBeInTheDocument();
    expect(screen.getByText("Rate limit reached.")).toBeInTheDocument();
    expect(screen.getByText(/3 of 5 completed/)).toBeInTheDocument();
  });
});

describe("critic panel", () => {
  it("surfaces the verdict, red flags and confidence ceiling", () => {
    render(<CriticPanel critique={critique} disagreements={disagreements} iterations={2} />);
    expect(screen.getByText("Sent back for revision")).toBeInTheDocument();
    expect(screen.getByText("Red flags")).toBeInTheDocument();
    expect(screen.getByText("Revenue claim contradicts the financials")).toBeInTheDocument();
    expect(screen.getByText("Contradictions")).toBeInTheDocument();
    expect(screen.getByText("2 rounds")).toBeInTheDocument();
    expect(screen.getByText(/0\.62/)).toBeInTheDocument();
  });

  it("warns when cross-validation did not run at all", () => {
    render(<CriticPanel critique={null} disagreements={[]} iterations={1} />);
    expect(screen.getByText(/have not been independently challenged/)).toBeInTheDocument();
  });
});

describe("plan panel", () => {
  it("explains both the applied and the unused methodologies", () => {
    render(<PlanPanel plan={plan} />);
    expect(screen.getByText("Not applied")).toBeInTheDocument();
    expect(screen.getByText(/of \d+ applied/)).toBeInTheDocument();
  });
});

describe("profile panel", () => {
  it("renders the extracted profile with its evidence quality", () => {
    render(<ProfilePanel profile={profile} />);
    expect(screen.getByText("Seed")).toBeInTheDocument();
    expect(screen.getByText("Evidence quality of this profile")).toBeInTheDocument();
    expect(screen.getByText("Business model")).toBeInTheDocument();
  });
});

describe("investment report", () => {
  it("leads with the recommendation, its reasoning and its confidence", () => {
    render(
      <InvestmentReport
        thesis={thesis}
        profile={profile}
        results={results}
        critique={critique}
        disagreements={disagreements}
        startupName="Test Co"
      />,
    );
    expect(screen.getByText("Consider")).toBeInTheDocument();
    expect(screen.getByText(/Traction is real but thin/)).toBeInTheDocument();
    expect(screen.getByText("Overall confidence")).toBeInTheDocument();
    expect(screen.getByText(/A seed-stage SaaS company/)).toBeInTheDocument();
  });

  it("does not bury what the analysis could not establish", () => {
    render(
      <InvestmentReport
        thesis={thesis} profile={profile} results={results}
        critique={critique} disagreements={disagreements} startupName="Test Co"
      />,
    );
    expect(screen.getByText("Incomplete analysis")).toBeInTheDocument();
    // Named in the confidence caveats and again in the incompleteness section.
    expect(screen.getAllByText(/Rate limit reached/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Missing information")).toBeInTheDocument();
    expect(screen.getByText("Can you share audited accounts?", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Why these methodologies")).toBeInTheDocument();
    expect(screen.getByText(/not investment advice/)).toBeInTheDocument();
  });

  it("renders all three scenarios", () => {
    const { container } = render(
      <InvestmentReport
        thesis={thesis} profile={profile} results={results}
        critique={critique} disagreements={disagreements} startupName="Test Co"
      />,
    );
    const scenarios = within(container).getByText("Scenarios").closest("section")!;
    expect(within(scenarios).getByText("Bull")).toBeInTheDocument();
    expect(within(scenarios).getByText("Base")).toBeInTheDocument();
    expect(within(scenarios).getByText("Bear")).toBeInTheDocument();
  });

  it("falls back gracefully when synthesis produced nothing", () => {
    render(
      <InvestmentReport
        thesis={null} profile={profile} results={results}
        critique={null} disagreements={[]} startupName="Test Co"
      />,
    );
    expect(screen.getByText(/remain valid on their own/)).toBeInTheDocument();
  });
});

describe("markdown export", () => {
  it("includes the recommendation, the valuation table and the caveats", () => {
    const markdown = thesisToMarkdown({
      startupName: "Test Co", profile, thesis, results, critique, disagreements,
      generatedAt: new Date("2026-09-01T00:00:00Z"),
    });
    expect(markdown).toContain("# Investment Analysis — Test Co");
    expect(markdown).toContain("**Consider**");
    expect(markdown).toContain("| Methodology | Low | Point | High | Confidence |");
    expect(markdown).toContain("Berkus Method");
    expect(markdown).toContain("## Where the Methodologies Disagree");
    expect(markdown).toContain("## Incomplete Analysis");
    expect(markdown).toContain("verify before acting on it");
  });

  it("still produces a document when there is no thesis", () => {
    const markdown = thesisToMarkdown({
      startupName: "Test Co", profile, thesis: null, results, critique: null, disagreements: [],
    });
    expect(markdown).toContain("The investment thesis could not be generated");
    expect(markdown).toContain("## Startup Overview");
  });
});
