// The Ask tab.
//
// Ask used to be a form that launched runs. It is now a conversation about the
// company, so what matters is that a question reaches the service with the
// analysis attached, the answer appears under it, and a failure is visible
// rather than a silently empty thread.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import AskChat from "@/components/workspace/AskChat";
import { ServiceError } from "@/lib/analyst/service";
import * as service from "@/lib/analyst/service";
import { makeResult } from "./helpers";

const context = {
  startupName: "Northwind Labs",
  narrative: "Cross-border payments for logistics SMEs.",
  results: { scorecard: makeResult("scorecard", { confidence: 0.39 }) },
};

const reply = (answer: string, basis: string[] = []) =>
  Promise.resolve({ answer, basis, grounded: true, degraded: false });

let ask: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.spyOn(service, "isServiceConfigured").mockReturnValue(true);
  ask = vi.spyOn(service, "askAboutCompany").mockImplementation(() => reply("Distribution is the binding risk."));
});

afterEach(() => vi.restoreAllMocks());

const show = (props: Partial<React.ComponentProps<typeof AskChat>> = {}) =>
  render(<AskChat context={context} startupName="Northwind Labs" hasAnalysis {...props} />);

const type = (text: string) => {
  const box = screen.getByLabelText(/ask a question/i);
  fireEvent.change(box, { target: { value: text } });
  return box;
};

describe("asking about the company", () => {
  it("opens on the company, not on an empty box", () => {
    show();
    expect(screen.getByText(/ask about northwind labs/i)).toBeInTheDocument();
  });

  it("says answers come from the analysis when one has run", () => {
    show();
    expect(screen.getByText(/methodology results, the critique and the thesis/i)).toBeInTheDocument();
  });

  it("says where answers come from when nothing has run yet", () => {
    show({ hasAnalysis: false });
    expect(screen.getByText(/no analysis has run yet/i)).toBeInTheDocument();
  });

  it("sends the question with the company attached", async () => {
    show();
    type("What is the biggest risk?");
    fireEvent.click(screen.getByLabelText("Send"));

    await waitFor(() => expect(ask).toHaveBeenCalled());
    const [question, sent] = ask.mock.calls[0];
    expect(question).toBe("What is the biggest risk?");
    expect((sent as typeof context).startupName).toBe("Northwind Labs");
    expect((sent as typeof context).results).toBeDefined();
  });

  it("shows the question and then the answer", async () => {
    show();
    type("What is the biggest risk?");
    fireEvent.click(screen.getByLabelText("Send"));

    expect(screen.getByText("What is the biggest risk?")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Distribution is the binding risk.")).toBeInTheDocument(),
    );
  });

  it("shows what the answer rested on", async () => {
    ask.mockImplementation(() => reply("Distribution.", ["Risk Analysis", "Investment thesis"]));
    show();
    type("Why?");
    fireEvent.click(screen.getByLabelText("Send"));

    await waitFor(() => expect(screen.getByText("Risk Analysis")).toBeInTheDocument());
    expect(screen.getByText("Investment thesis")).toBeInTheDocument();
  });

  it("sends on Enter and keeps Shift-Enter for a new line", async () => {
    show();
    const box = type("A question");
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(ask).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
  });

  it("carries the thread so a follow-up has something to attach to", async () => {
    show();
    type("First question");
    fireEvent.click(screen.getByLabelText("Send"));
    await waitFor(() => expect(screen.getByText("Distribution is the binding risk.")).toBeInTheDocument());

    type("Why?");
    fireEvent.click(screen.getByLabelText("Send"));
    await waitFor(() => expect(ask).toHaveBeenCalledTimes(2));

    const history = ask.mock.calls[1][2] as { role: string; content: string }[];
    expect(history).toEqual([
      { role: "user", content: "First question" },
      { role: "assistant", content: "Distribution is the binding risk." },
    ]);
  });

  it("does not send an empty question", () => {
    show();
    type("   ");
    expect(screen.getByLabelText("Send")).toBeDisabled();
  });

  it("asks a suggested question on one click", async () => {
    show();
    fireEvent.click(screen.getByText("What is the biggest risk here?"));
    await waitFor(() => expect(ask).toHaveBeenCalledWith(
      "What is the biggest risk here?", expect.anything(), expect.anything(),
    ));
  });

  it("shows a failure rather than leaving the thread empty", async () => {
    ask.mockImplementation(() => Promise.reject(new ServiceError("The service is unreachable.")));
    show();
    type("Anything?");
    fireEvent.click(screen.getByLabelText("Send"));

    await waitFor(() => expect(screen.getByText("The service is unreachable.")).toBeInTheDocument());
  });

  it("disables itself when the service is not configured", () => {
    vi.spyOn(service, "isServiceConfigured").mockReturnValue(false);
    show();
    expect(screen.getByLabelText(/ask a question/i)).toBeDisabled();
  });

  it("clears the thread on request", async () => {
    show();
    type("A question");
    fireEvent.click(screen.getByLabelText("Send"));
    await waitFor(() => expect(screen.getByText("Distribution is the binding risk.")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryByText("A question")).not.toBeInTheDocument();
    expect(screen.getByText(/ask about northwind labs/i)).toBeInTheDocument();
  });

  it("states that it cannot start or change a run", () => {
    show();
    expect(screen.getByText(/cannot start or change a run/i)).toBeInTheDocument();
  });
});
