// The full-width investment report.
//
// These components take whatever the agents produced, which is not always
// tidy: a disagreement can compare a 0-10 score against a dollar valuation, a
// reconciler can exclude a methodology that never reached `perMethodology`,
// and a run can finish with no valuation at all. The tests below are mostly
// about those cases, because the happy path is the one that already looks
// right on screen.

import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import ReportHero from "@/components/analyst/report/ReportHero";
import ValuationBridge from "@/components/analyst/report/ValuationBridge";
import DimensionChart from "@/components/analyst/report/DimensionChart";
import RiskMatrix from "@/components/analyst/report/RiskMatrix";
import {
  ConfidencePanel, Disagreements, MethodologyMap, OpenQuestions, ScenarioBand,
} from "@/components/analyst/report/ReportSections";

import type {
  Disagreement, InvestmentThesis, ReconciledValuation, RiskItem, ScoredSection,
} from "@/lib/analyst/types";

const range = (low: number, point: number, high: number) =>
  ({ low, point, high, currency: "USD" as const });

const section = (key: string, title: string, score10: number, confidence: number): ScoredSection => ({
  key,
  title,
  score10,
  confidence,
  narrative: `Narrative for ${title}.`,
  evidence: [`ev-${key}`],
  keyAssumptions: [`Assumed for ${title}.`],
  missingInformation: [`Missing for ${title}.`],
});

const risk = (id: string, severity: RiskItem["severity"], likelihood: number): RiskItem => ({
  id,
  category: "financial",
  title: `Risk ${id}`,
  description: `Description for ${id}.`,
  severity,
  likelihood,
  mitigation: `Mitigation for ${id}.`,
  evidence: [],
  source: "risk_analysis",
});

const thesis: InvestmentThesis = {
  executiveSummary: "Northwind sells workflow software and collects $14k a month.",
  thesis: "A staged seed bet conditional on verified unit economics.",
  sections: [
    section("company", "Company overview", 6, 0.75),
    section("market", "Market", 5.1, 0.13),
    section("product", "Product & technology", 6.5, 0.45),
    section("risks", "Principal risks", 3.3, 0.39),
  ],
  valuation: {
    reconciled: null as unknown as ReconciledValuation,
    perMethodology: [
      { methodologyId: "scorecard", name: "Scorecard Method", range: range(2_280_000, 4_070_000, 6_410_000), confidence: 0.47 },
      { methodologyId: "risk_factor", name: "Risk Factor Summation", range: range(775_000, 3_770_000, 6_780_000), confidence: 0.37 },
      { methodologyId: "berkus", name: "Berkus Method", range: null, confidence: 0 },
    ],
    keyAssumptions: [],
  },
  risks: [
    risk("burn", "critical", 0.5),
    risk("churn", "high", 0.75),
    risk("brand", "low", 0.2),
  ],
  missingInformation: [
    { field: "cap_table", why: "Dilution cannot be modelled.", blocks: ["scorecard"], question: "Share the cap table." },
  ],
  methodologySelectionExplanation: [
    { methodologyId: "scorecard", name: "Scorecard Method", reason: "A comparable anchor was supplied.", used: true },
    { methodologyId: "berkus", name: "Berkus Method", reason: "Berkus targets pre-revenue companies.", used: false },
  ],
  confidence: {
    overall: 0.35,
    evidenceQuality: 0.89,
    coverage: 1,
    drivers: ["9 of 9 planned methodologies completed."],
    caveats: ["The critic capped confidence at 0.35."],
  },
  bullCase: { label: "Validated scale", narrative: "Unit economics prove out.", probability: 0.15, valuationUsd: 6_780_000, drivers: ["Churn proven low."] },
  baseCase: { label: "Gradual scale", narrative: "Steady growth after diligence.", probability: 0.55, valuationUsd: 3_770_000, drivers: ["Funding secured."] },
  bearCase: { label: "Runway failure", narrative: "Cash runs out first.", probability: 0.3, valuationUsd: 775_000, drivers: ["No bridge financing."] },
  recommendation: "consider",
  recommendationReasoning: "Conditional on diligence.",
  incompleteAnalysis: [],
};

const reconciled: ReconciledValuation = {
  range: range(775_000, 3_770_000, 6_780_000),
  method: "Confidence-weighted geometric mean",
  weights: [{ methodologyId: "risk_factor", weight: 1, rationale: "Captures the documented operational risks." }],
  excluded: [
    { methodologyId: "vc_method", reason: "Requires a credible exit-year revenue projection." },
  ],
  spreadRatio: 1.08,
  agreement: 0.97,
  confidence: 0.36,
  explanation: "The band is conditional on closing the missing diligence items.",
  keyAssumptions: ["Founders supply a reconciled P&L."],
};

describe("report hero", () => {
  it("puts the verdict, the range and what it is worth in one eyeline", () => {
    const { container } = render(
      <ReportHero thesis={thesis} reconciled={reconciled} startupName="Northwind" />,
    );
    expect(screen.getByText("Consider")).toBeInTheDocument();
    expect(container.textContent).toContain("35");
    expect(container.textContent).toContain("89%");
    expect(screen.getByText(/Reconciled valuation/i)).toBeInTheDocument();
    // Two of the three methodologies produced a figure.
    expect(container.textContent).toMatch(/2 valuation methodologies/);
  });

  it("says so plainly when no methodology produced a figure", () => {
    const bare = {
      ...thesis,
      valuation: { ...thesis.valuation, perMethodology: [] },
    };
    render(<ReportHero thesis={bare} reconciled={null} startupName="Northwind" />);
    expect(screen.getByText("No valuation")).toBeInTheDocument();
  });
});

describe("valuation bridge", () => {
  it("ranks the methods that ran and shows the reconciled band on the same axis", () => {
    const { container } = render(<ValuationBridge thesis={thesis} reconciled={reconciled} />);
    expect(screen.getByText("Scorecard Method")).toBeInTheDocument();
    expect(screen.getByText("Risk Factor Summation")).toBeInTheDocument();
    expect(screen.getByText("Reconciled")).toBeInTheDocument();
    expect(container.textContent).toContain("Confidence-weighted geometric mean");
  });

  it("lists an exclusion the reconciler recorded even when no methodology row carries it", () => {
    render(<ValuationBridge thesis={thesis} reconciled={reconciled} />);
    // Berkus comes off perMethodology; vc_method exists only in `excluded`.
    // Before the fix this heading appeared with nothing underneath it.
    expect(screen.getByText("Did not produce a figure")).toBeInTheDocument();
    expect(screen.getByText(/Berkus Method/)).toBeInTheDocument();
    expect(screen.getByText(/exit-year revenue projection/)).toBeInTheDocument();
  });

  it("explains itself rather than rendering an empty section when nothing ran", () => {
    const bare = { ...thesis, valuation: { ...thesis.valuation, perMethodology: [] } };
    render(<ValuationBridge thesis={bare} reconciled={reconciled} />);
    expect(screen.getByText(/No methodology produced a defensible figure/i)).toBeInTheDocument();
  });
});

describe("scenarios and dimensions", () => {
  it("draws all three scenarios with their probabilities", () => {
    const { container } = render(
      <ScenarioBand bear={thesis.bearCase} base={thesis.baseCase} bull={thesis.bullCase} />,
    );
    expect(container.textContent).toContain("55%");
    expect(container.textContent).toContain("30%");
    expect(container.textContent).toContain("15%");
    expect(screen.getByText(/Cash runs out first/)).toBeInTheDocument();
  });

  it("shows score and confidence as separate charts, and opens a dimension onto its evidence", () => {
    render(<DimensionChart sections={thesis.sections} />);
    expect(screen.getByText("Score by dimension")).toBeInTheDocument();
    expect(screen.getByText("Confidence by dimension")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Market/ }));
    expect(screen.getByText("Narrative for Market.")).toBeInTheDocument();
    expect(screen.getByText("Missing for Market.")).toBeInTheDocument();
  });

  it("names the weakest dimension rather than leaving the reader to find it", () => {
    const { container } = render(<DimensionChart sections={thesis.sections} />);
    expect(container.textContent).toMatch(/weakest dimension here is market/i);
  });
});

describe("risk matrix", () => {
  it("plots one point per risk and opens it on hover", () => {
    const { container } = render(<RiskMatrix risks={thesis.risks} />);
    expect(container.querySelectorAll("circle")).toHaveLength(thesis.risks.length);
    expect(container.textContent).toContain("3 risks");

    fireEvent.mouseEnter(screen.getByLabelText(/Risk churn: high severity/));
    expect(screen.getByText("Description for churn.")).toBeInTheDocument();
    expect(screen.getByText("Mitigation for churn.")).toBeInTheDocument();
  });

  it("does not pretend an empty risk list means no risk", () => {
    render(<RiskMatrix risks={[]} />);
    expect(screen.getByText(/not the same as there being none/i)).toBeInTheDocument();
  });
});

describe("disagreements", () => {
  it("does not format a 0-10 score as dollars, and drops the bars when units differ", () => {
    const mixed: Disagreement[] = [{
      id: "d1",
      topic: "Valuation is not supported by the financial position",
      parties: ["financial_analysis", "scorecard"],
      values: [
        { methodologyId: "financial_analysis", label: "Financial health (0-10)", value: 1 },
        { methodologyId: "scorecard", label: "Provisional valuation (USD)", value: 3_940_000 },
      ],
      spreadRatio: 0,
      severity: "high",
      rootCause: "The anchor is founder-supplied.",
      moreCredible: "financial_analysis",
      explanation: "Both cannot be trusted at once.",
      missingInfo: [],
    }];

    const { container } = render(<Disagreements items={mixed} />);
    // "$1" was what this used to print for a score of 1.0.
    expect(container.textContent).not.toContain("$1 ");
    expect(container.textContent).toContain("3.94M");
    expect(screen.getByText("Financial health (0-10)")).toBeInTheDocument();
    expect(screen.getByText(/Both cannot be trusted at once/)).toBeInTheDocument();
  });

  it("says so when the methods did not disagree", () => {
    render(<Disagreements items={[]} />);
    expect(screen.getByText(/did not materially disagree/i)).toBeInTheDocument();
  });
});

describe("methodology map and open questions", () => {
  it("splits what ran from what refused, with the reasoning behind each", () => {
    render(<MethodologyMap entries={thesis.methodologySelectionExplanation} />);
    expect(screen.getByText("Ran (1)")).toBeInTheDocument();
    expect(screen.getByText("Declined (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Berkus Method/ }));
    expect(screen.getByText(/Berkus targets pre-revenue companies/)).toBeInTheDocument();
  });

  it("puts the open questions in the founder's terms, with what they block", () => {
    const { container } = render(<OpenQuestions gaps={thesis.missingInformation} />);
    expect(screen.getByText("Share the cap table.")).toBeInTheDocument();
    expect(container.textContent).toContain("Blocks: scorecard");
  });

  it("shows what supports the conclusion beside what limits it", () => {
    const { container } = render(<ConfidencePanel thesis={thesis} />);
    const text = container.textContent ?? "";
    expect(text).toContain("What supports the conclusion");
    expect(text).toContain("What limits it");
    expect(text).toContain("capped confidence");
  });
});
