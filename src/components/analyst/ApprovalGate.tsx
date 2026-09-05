// Human checkpoint.
//
// The run is genuinely blocked when this renders: the orchestrator is holding
// an open future on the server and will not advance until the decision is
// posted back. That is why this takes over the command bar rather than sitting
// quietly in a corner, and why rejecting says plainly that it ends the run.

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import type { ApprovalRequest } from "@/lib/analyst/graphTypes";
import { Row } from "./primitives";

const readableKey = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

const readableValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "object") return "";
  return String(value);
};

export const ApprovalGate = ({
  approval,
  onRespond,
  busy = false,
}: {
  approval: ApprovalRequest;
  onRespond: (approved: boolean, note: string) => void;
  busy?: boolean;
}) => {
  const [note, setNote] = useState("");

  const facts = Object.entries(approval.payload ?? {})
    .map(([key, value]) => [readableKey(key), readableValue(value)] as const)
    .filter(([, value]) => value !== "");

  return (
    <section
      className="panel-raised p-5"
      role="alertdialog"
      aria-labelledby="approval-question"
      aria-describedby="approval-detail"
    >
      <div className="flex items-start gap-3">
        <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--caution)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="kicker">Approval required · {approval.label}</p>
          <h3 id="approval-question" className="mt-1.5 text-[15px] font-medium leading-snug text-[var(--ink-1)]">
            {approval.question}
          </h3>
          <p id="approval-detail" className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            The run is paused here and will not continue until you decide.
          </p>
        </div>
      </div>

      {facts.length > 0 && (
        <div className="mt-4 border-t border-[var(--rule)] pt-1">
          {facts.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </div>
      )}

      <label className="mt-4 block">
        <span className="kicker">Note for the agents (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          disabled={busy}
          placeholder="Anything the later agents should take into account."
          className="mt-2 w-full resize-y rounded-[var(--radius)] border border-[var(--rule-strong)] bg-[var(--page)]
                     px-3 py-2 text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]
                     focus:border-[var(--accent-ink)] focus:outline-none disabled:opacity-60"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRespond(true, note.trim())}
          className="rounded-[var(--radius)] bg-[var(--accent-ink)] px-4 py-2 text-[13px] font-medium text-white
                     transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Sending" : "Approve and continue"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRespond(false, note.trim())}
          className="rounded-[var(--radius)] border border-[var(--rule-strong)] px-4 py-2 text-[13px]
                     text-[var(--ink-2)] transition-colors hover:border-[var(--negative)] hover:text-[var(--negative)]
                     disabled:opacity-50"
        >
          Stop the run
        </button>
        <p className="text-[12px] text-[var(--ink-3)]">Stopping ends this analysis. Results already produced are kept.</p>
      </div>
    </section>
  );
};

export default ApprovalGate;
