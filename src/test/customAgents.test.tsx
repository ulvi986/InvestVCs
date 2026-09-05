// Putting your own agent into the workflow.
//
// The backend has been able to execute a user-defined agent for a while. What
// these cover is the half that decides whether anyone can actually ask for
// one: the agent has to be selectable beside the built-ins, and deleting it
// has to withdraw it from the selection rather than leave a dead id behind
// that the service silently skips.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import AgentInspector from "@/components/analyst/AgentInspector";
import IntakePanel from "@/components/analyst/IntakePanel";
import { METHODOLOGY_META } from "@/lib/analyst/registry";
import type { CustomAgent } from "@/lib/analyst/service";
import type { GraphNode } from "@/lib/analyst/graphTypes";
import { makeBundle, makeResult } from "./helpers";

const ownAgent: CustomAgent = {
  id: "custom_regulatory_exposure",
  name: "Regulatory Exposure",
  purpose: "Whether this company needs a licence it does not have.",
  instruction: "Identify every licence this business model requires.",
  family: "risk",
  requiredInputs: [],
};

const renderPanel = (props: Partial<React.ComponentProps<typeof IntakePanel>> = {}) => {
  const onChosenIdsChange = vi.fn();
  render(
    <IntakePanel
      bundle={makeBundle({ narrative: "A logistics automation company." })}
      onBundleChange={() => {}}
      mode="guided"
      onModeChange={() => {}}
      chosenIds={[]}
      onChosenIdsChange={onChosenIdsChange}
      onStart={() => {}}
      onCancel={() => {}}
      isRunning={false}
      customAgents={[ownAgent]}
      {...props}
    />,
  );
  return { onChosenIdsChange };
};

describe("choosing your own agent", () => {
  it("offers it beside the built-in methodologies", () => {
    renderPanel();
    expect(screen.getByText("Regulatory Exposure")).toBeInTheDocument();
    // The built-ins are still all there; the agent is an addition, not a swap.
    expect(screen.getByText(METHODOLOGY_META[0].name)).toBeInTheDocument();
  });

  it("marks it as the team's own, so it is not mistaken for a built-in", () => {
    renderPanel();
    const row = screen.getByText("Regulatory Exposure").closest("label");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText(/yours/i)).toBeInTheDocument();
  });

  it("shows the purpose the author wrote", () => {
    renderPanel();
    expect(screen.getByText(ownAgent.purpose)).toBeInTheDocument();
  });

  it("falls back to a label when the author left the purpose blank", () => {
    renderPanel({ customAgents: [{ ...ownAgent, purpose: "" }] });
    expect(screen.getByText("Added by your team.")).toBeInTheDocument();
  });

  it("selects it by its own id, which is what the service resolves", () => {
    const { onChosenIdsChange } = renderPanel();
    fireEvent.click(screen.getByText("Regulatory Exposure"));
    expect(onChosenIdsChange).toHaveBeenCalledWith([ownAgent.id]);
  });

  it("counts it in 'select all', so the roster is the whole roster", () => {
    const { onChosenIdsChange } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));

    const ids = onChosenIdsChange.mock.calls[0][0] as string[];
    expect(ids).toHaveLength(METHODOLOGY_META.length + 1);
    expect(ids).toContain(ownAgent.id);
  });

  it("clears everything when all of them are already selected", () => {
    const all = [...METHODOLOGY_META.map((m) => m.id), ownAgent.id];
    const { onChosenIdsChange } = renderPanel({ chosenIds: all });

    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onChosenIdsChange).toHaveBeenCalledWith([]);
  });

  it("shows only the built-ins when the team has added none", () => {
    renderPanel({ customAgents: [] });
    expect(screen.queryByText("Regulatory Exposure")).not.toBeInTheDocument();
    expect(screen.getByText(METHODOLOGY_META[0].name)).toBeInTheDocument();
  });

  it("hides the roster entirely in autonomous mode, where the analyst chooses", () => {
    renderPanel({ mode: "autonomous" });
    expect(screen.queryByText("Regulatory Exposure")).not.toBeInTheDocument();
  });
});


// The written answer is the whole point of a user-defined agent: it has no
// deterministic figures to fall back on, so if the inspector does not show
// findings, concerns and unknowns, the agent has effectively run in silence.
// The payload here is the shape a live run actually returned.
describe("reading what your agent found", () => {
  const result = makeResult("custom_regulatory_exposure", {
    name: "Regulatory Exposure",
    family: "risk",
    headline: "Confirmed: no in-house payment institution licence.",
    score10: 2,
    confidence: 0.21,
    inputs: {
      assessment: "Material states the company holds no payment institution licence and relies on a partner BIN sponsor.",
      score10: 2,
      findings: ["The narrative states it does not hold a payment institution licence."],
      concerns: ["Reliance on a BIN sponsor creates regulatory concentration risk."],
      unknowns: ["Whether it holds an EMI licence in any member state."],
    },
    computed: { score10: 2 },
  });

  const node = {
    id: "methodology:custom_regulatory_exposure",
    label: "Regulatory Exposure",
    kind: "methodology",
    layer: 3,
    status: "completed",
    agent: "custom_regulatory_exposure",
    headline: result.headline,
    confidence: 0.21,
    toolLabels: [],
    summary: null,
  } as unknown as GraphNode;

  const show = () => render(<AgentInspector node={node} result={result} onClose={() => {}} />);

  it("shows the assessment it wrote", () => {
    show();
    expect(screen.getByText(/relies on a partner BIN sponsor/)).toBeInTheDocument();
  });

  it("shows what it established", () => {
    show();
    expect(screen.getByText(/does not hold a payment institution licence/)).toBeInTheDocument();
  });

  it("shows what worries it", () => {
    show();
    expect(screen.getByText(/regulatory concentration risk/)).toBeInTheDocument();
  });

  it("shows what it could not establish, so a gap is not read as a clean bill", () => {
    show();
    expect(screen.getByText(/EMI licence in any member state/)).toBeInTheDocument();
  });

  it("omits a section the agent left empty rather than showing an empty heading", () => {
    const bare = makeResult("custom_regulatory_exposure", {
      inputs: { assessment: "", findings: [], concerns: [], unknowns: [] },
    });
    render(<AgentInspector node={node} result={bare} onClose={() => {}} />);
    expect(screen.queryByText("What worries it")).not.toBeInTheDocument();
    expect(screen.queryByText("Assessment")).not.toBeInTheDocument();
  });

  it("ignores a non-list value instead of crashing the panel", () => {
    const odd = makeResult("custom_regulatory_exposure", {
      inputs: { findings: "not a list", concerns: [123, "", "  "], unknowns: null },
    });
    render(<AgentInspector node={node} result={odd} onClose={() => {}} />);
    expect(screen.queryByText("What it established")).not.toBeInTheDocument();
    expect(screen.queryByText("What worries it")).not.toBeInTheDocument();
  });
});
