// Add an agent.
//
// An agent added here is not a drawing. It is sent with the run, the service
// turns it into a real methodology, and it is gated, planned, executed and
// criticised alongside the built-in twelve. That is also why the form asks for
// an instruction rather than a description: the instruction is what the agent
// is actually told to do.
//
// Agents are kept in localStorage so a team's own agents survive a reload.
// They are not shared between accounts.

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CustomAgent } from "@/lib/analyst/service";
import { Eyebrow, Tag } from "./primitives";

const STORAGE_KEY = "investvcs.customAgents";

/** Mirrors `FAMILIES` in `ai/app/custom.py`. A closed set, so the critic and
 *  the reconciler keep reasoning about families they understand. */
const FAMILIES: { value: string; label: string }[] = [
  { value: "risk", label: "Risk" },
  { value: "market", label: "Market" },
  { value: "competitive", label: "Competitive" },
  { value: "team", label: "Team" },
  { value: "business_model", label: "Business model" },
  { value: "readiness", label: "Readiness" },
  { value: "financial", label: "Financial" },
];

const slug = (name: string) =>
  `custom_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "agent"}`;

export function loadCustomAgents(): CustomAgent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const emptyDraft = { name: "", purpose: "", instruction: "", family: "risk" };

export const CustomAgentPanel = ({
  agents, onChange, disabled = false,
}: {
  agents: CustomAgent[];
  onChange: (agents: CustomAgent[]) => void;
  disabled?: boolean;
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    } catch {
      // A full or blocked store is not worth interrupting the user over.
    }
  }, [agents]);

  const add = () => {
    const name = draft.name.trim();
    const instruction = draft.instruction.trim();

    if (!name || !instruction) {
      setError("An agent needs a name and an instruction telling it what to do.");
      return;
    }
    const id = slug(name);
    if (agents.some((agent) => agent.id === id)) {
      setError("You already have an agent with that name.");
      return;
    }

    onChange([
      ...agents,
      { id, name, purpose: draft.purpose.trim(), instruction, family: draft.family, requiredInputs: [] },
    ]);
    setDraft(emptyDraft);
    setError(null);
    setOpen(false);
  };

  const field =
    "w-full rounded-[var(--radius)] border border-[var(--rule-strong)] bg-[var(--page)] px-3 py-2 " +
    "text-[13.5px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)] " +
    "focus:border-[var(--accent-ink)] focus:outline-none disabled:opacity-60";

  return (
    <div>
      {agents.length > 0 && (
        <ul className="mb-6">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="flex items-start gap-4 border-b border-[var(--rule)] py-4 first:border-t first:border-[var(--rule)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[14px] font-medium text-[var(--ink-1)]">{agent.name}</span>
                  <Tag tone="muted">{FAMILIES.find((f) => f.value === agent.family)?.label ?? agent.family}</Tag>
                </div>
                {agent.purpose && (
                  <p className="measure mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">{agent.purpose}</p>
                )}
                <p className="measure mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  {agent.instruction}
                </p>
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(agents.filter((item) => item.id !== agent.id))}
                aria-label={`Remove ${agent.name}`}
                className="shrink-0 p-1.5 text-[var(--ink-3)] transition-colors hover:text-[var(--negative)] disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="panel p-5">
          <Eyebrow>New agent</Eyebrow>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="kicker">Name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Regulatory exposure"
                className={`${field} mt-2`}
              />
            </label>

            <label className="block">
              <span className="kicker">Family</span>
              <select
                value={draft.family}
                onChange={(event) => setDraft({ ...draft, family: event.target.value })}
                className={`${field} mt-2`}
              >
                {FAMILIES.map((family) => (
                  <option key={family.value} value={family.value}>{family.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="kicker">What question does it answer?</span>
            <input
              value={draft.purpose}
              onChange={(event) => setDraft({ ...draft, purpose: event.target.value })}
              placeholder="Whether this company needs a licence it does not have."
              className={`${field} mt-2`}
            />
          </label>

          <label className="mt-4 block">
            <span className="kicker">Instruction</span>
            <textarea
              rows={3}
              value={draft.instruction}
              onChange={(event) => setDraft({ ...draft, instruction: event.target.value })}
              placeholder="Identify every licence or approval this business model requires, and whether the company holds it."
              className={`${field} mt-2 resize-y`}
            />
            <span className="mt-1.5 block text-[12px] leading-relaxed text-[var(--ink-3)]">
              This is what the agent is told to do. Be specific about what it should look for and what it should refuse
              to conclude without evidence.
            </span>
          </label>

          {error && <p className="mt-3 text-[12.5px] text-[var(--negative)]">{error}</p>}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={add}
              className="rounded-[var(--radius)] bg-[var(--accent-ink)] px-4 py-2 text-[13px] font-medium
                         text-white transition-opacity hover:opacity-90"
            >
              Add agent
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); setDraft(emptyDraft); }}
              className="text-[13px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--rule-strong)]
                     px-4 py-2 text-[13px] text-[var(--ink-2)] transition-colors
                     hover:border-[var(--accent-ink)] hover:text-[var(--ink-1)] disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add an agent
        </button>
      )}

      <p className="measure mt-5 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
        Your agents run alongside the built-in twelve and are cross-examined by the same verification step. They have no
        deterministic calculation behind them, so their confidence is capped lower and that limitation is stated on
        every result they produce.
      </p>
    </div>
  );
};

export default CustomAgentPanel;
