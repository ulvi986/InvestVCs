// The client's copy of the re-run guard.
//
// The service streams a `result` event for every attempt, including the
// critic's re-runs, and keeps the stronger of the two for its own
// reconciliation. A UI that simply takes whichever arrived last therefore ends
// up showing a blank for an agent that did produce an answer, and contradicting
// the report printed beside it.
//
// Observed in a real run: First Chicago completed with a $20.9M valuation and
// was then re-run as `insufficient_input`; Market Analysis completed at 0.15
// confidence and was re-run at 0.0.

import { describe, it, expect } from "vitest";
import { supersedes } from "@/hooks/useInvestmentAnalyst";
import { makeResult } from "./helpers";

describe("which streamed result wins", () => {
  it("takes the first result for a methodology", () => {
    expect(supersedes(undefined, makeResult("scorecard", { confidence: 0.4 }))).toBe(true);
  });

  it("keeps a good result when the re-run failed", () => {
    const previous = makeResult("scorecard", { confidence: 0.39 });
    const candidate = makeResult("scorecard", { status: "failed", confidence: 0 });
    expect(supersedes(previous, candidate)).toBe(false);
  });

  it("keeps a valuation when the re-run says it has too little to work with", () => {
    const previous = makeResult("first_chicago", { confidence: 0.32 });
    const candidate = makeResult("first_chicago", { status: "insufficient_input", confidence: 0 });
    expect(supersedes(previous, candidate)).toBe(false);
  });

  it("keeps a confident judgement over one with no confidence behind it", () => {
    const previous = makeResult("market_analysis", { family: "market", confidence: 0.15 });
    const candidate = makeResult("market_analysis", { family: "market", confidence: 0 });
    expect(supersedes(previous, candidate)).toBe(false);
  });

  it("still accepts a genuine revision, even a less confident one", () => {
    const previous = makeResult("scorecard", { confidence: 0.39 });
    const candidate = makeResult("scorecard", { confidence: 0.28 });
    expect(supersedes(previous, candidate)).toBe(true);
  });

  it("lets a re-run rescue a result that had no confidence", () => {
    const previous = makeResult("market_analysis", { family: "market", confidence: 0 });
    const candidate = makeResult("market_analysis", { family: "market", confidence: 0.31 });
    expect(supersedes(previous, candidate)).toBe(true);
  });
});
