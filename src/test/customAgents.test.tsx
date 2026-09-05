// Putting your own agent into the workflow.
//
// The backend has been able to execute a user-defined agent for a while. What
// these cover is the half that decides whether anyone can actually ask for
// one: the agent has to be selectable beside the built-ins, and deleting it
// has to withdraw it from the selection rather than leave a dead id behind
// that the service silently skips.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import IntakePanel from "@/components/analyst/IntakePanel";
import { METHODOLOGY_META } from "@/lib/analyst/registry";
import type { CustomAgent } from "@/lib/analyst/service";
import { makeBundle } from "./helpers";

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
