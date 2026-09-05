// The command bar.
//
// The primary way into the product: say what you want done and the
// orchestrator builds the workflow. It compiles the instruction on the
// service first and shows what it decided, so the user approves a real plan
// instead of watching an opaque run start. Nothing is executed until they say
// so.
//
// When the service is unreachable the bar says so and disables itself rather
// than pretending to think.

import { useEffect, useRef, useState } from "react";
import { ArrowUp, CornerDownLeft, Loader2, X } from "lucide-react";
import type { WorkflowSpec } from "@/lib/analyst/graphTypes";
import type { CommandPlan, CustomAgent } from "@/lib/analyst/service";
import { ServiceError, compileCommand, isServiceConfigured } from "@/lib/analyst/service";
import { methodologyName } from "@/lib/analyst/registry";

/** Shown when the bar is empty. Real instructions, not placeholder filler. */
const EXAMPLES = [
  "Evaluate this startup and tell me whether it is investable",
  "Find the biggest risks",
  "Recalculate the valuation using Berkus",
  "Prepare this startup for an investment committee",
];

export interface CommandBarProps {
  /** Name of the startup in context, used by the compiler and for guarding. */
  startupName: string;
  /** Extra context the compiler can use to decide what is answerable. */
  startupContext?: unknown;
  /** The team's own agents, so an instruction may name one. */
  customAgents?: CustomAgent[];
  disabled?: boolean;
  onRun: (workflow: WorkflowSpec, plan: CommandPlan) => void;
  /** Called when a compiled plan needs a company and none is loaded, so the
   *  caller can take the user to where they can enter one. */
  onNeedStartup?: () => void;
}

export const CommandBar = ({
  startupName, startupContext, customAgents = [], disabled = false, onRun, onNeedStartup,
}: CommandBarProps) => {
  const [value, setValue] = useState("");
  const [plan, setPlan] = useState<CommandPlan | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const configured = isServiceConfigured();

  /** Built-in ids resolve from the static registry; the team's own agents only
   *  exist on this client, so they are resolved here rather than showing a raw
   *  `custom_…` id back to the person who named them. */
  const labelFor = (id: string) =>
    customAgents.find((agent) => agent.id === id)?.name ?? methodologyName(id);

  // Cmd/Ctrl-K focuses the bar from anywhere in the workspace.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Once a run is under way the proposal is history: the graph above is now
  // the answer to "what is about to happen".
  useEffect(() => {
    if (disabled) setPlan(null);
  }, [disabled]);

  const compile = async () => {
    const command = value.trim();
    if (!command || compiling) return;

    setCompiling(true);
    setError(null);
    setPlan(null);

    try {
      const compiled = await compileCommand(
        command,
        startupContext ?? { name: startupName },
        customAgents,
      );
      setPlan(compiled);
    } catch (caught) {
      setError(
        caught instanceof ServiceError
          ? caught.message
          : "The instruction could not be compiled into a workflow.",
      );
    } finally {
      setCompiling(false);
    }
  };

  const run = () => {
    if (!plan) return;
    onRun(plan.workflow, plan);
    setPlan(null);
    setValue("");
  };

  const blockedOnStartup = plan?.needsStartup && !startupName.trim();

  return (
    <div className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)]">
      {/* The compiled plan, before anything runs. */}
      {plan && (
        <div className="enter-up border-b border-[var(--rule)] px-4 py-3.5 sm:px-6">
          <div className="mx-auto flex max-w-[1100px] items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="kicker">Proposed workflow</p>
                <p className="text-[13px] font-medium text-[var(--ink-1)]">{plan.name}</p>
                {plan.fallback && (
                  <span className="text-[11.5px] text-[var(--caution)]">
                    Matched by keyword, the planner was unavailable
                  </span>
                )}
              </div>

              <p className="measure mt-1.5 text-[13px] leading-relaxed text-[var(--ink-2)]">
                {plan.clarification || plan.reply}
              </p>

              {!plan.clarification && (
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-3)]">
                  {plan.methodologyIds.length
                    ? `${plan.workflow.nodes.length} nodes · ${plan.methodologyIds.map(labelFor).join(", ")}`
                    : `${plan.workflow.nodes.length} nodes · methodologies chosen per company at plan time`}
                  {plan.approvals.length ? ` · pauses at ${plan.approvals.length} checkpoint${plan.approvals.length > 1 ? "s" : ""}` : ""}
                </p>
              )}

              {blockedOnStartup && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--caution)]">
                  This needs a company first.{" "}
                  {onNeedStartup && (
                    <button
                      type="button"
                      onClick={onNeedStartup}
                      className="text-[var(--accent-ink)] underline underline-offset-4"
                    >
                      Add one
                    </button>
                  )}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!plan.clarification && (
                <button
                  type="button"
                  onClick={run}
                  disabled={disabled || blockedOnStartup}
                  className="rounded-[var(--radius)] bg-[var(--accent-ink)] px-3.5 py-1.5 text-[12.5px] font-medium
                             text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Run it
                </button>
              )}
              <button
                type="button"
                onClick={() => setPlan(null)}
                aria-label="Dismiss the proposed workflow"
                className="rounded-[var(--radius)] p-1.5 text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-[var(--rule)] px-4 py-2.5 sm:px-6">
          <p className="mx-auto max-w-[1100px] text-[12.5px] text-[var(--negative)]">{error}</p>
        </div>
      )}

      <div className="px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex items-end gap-3 rounded-[var(--radius)] border border-[var(--rule-strong)]
                          bg-[var(--page)] px-3.5 py-2.5 transition-colors focus-within:border-[var(--accent-ink)]">
            <textarea
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void compile();
                }
              }}
              rows={1}
              disabled={!configured || disabled}
              placeholder={configured ? "Tell InvestVCS what to do" : "The analyst service is not connected"}
              aria-label="Instruction for the analyst"
              className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] leading-6
                         text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none
                         disabled:cursor-not-allowed"
            />

            <button
              type="button"
              onClick={() => void compile()}
              disabled={!configured || disabled || !value.trim() || compiling}
              aria-label="Compile this instruction into a workflow"
              className="mb-0.5 shrink-0 rounded-[var(--radius)] bg-[var(--accent-ink)] p-1.5 text-white
                         transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {compiling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
            </button>
          </div>

          {!value && !plan && configured && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setValue(example);
                    inputRef.current?.focus();
                  }}
                  className="text-[12px] text-[var(--ink-3)] underline-offset-4 transition-colors hover:text-[var(--ink-1)] hover:underline"
                >
                  {example}
                </button>
              ))}
              <span className="ml-auto hidden items-center gap-1 text-[11px] text-[var(--ink-3)] sm:inline-flex">
                <CornerDownLeft className="h-3 w-3" /> to plan
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
