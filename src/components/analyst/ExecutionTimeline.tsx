// Execution timeline.
//
// The run as it happened, in order, timestamped by the service. Reading it
// top to bottom answers "how did the system get here" without opening a
// single agent. Entries arrive over the stream; none are synthesised locally.

import { useMemo } from "react";
import type { ExecutionLogEntry } from "@/lib/analyst/graphTypes";
import { Empty, Eyebrow } from "./primitives";

/** Entry kinds that mark a boundary in the run rather than routine progress. */
const EMPHASISED = new Set([
  "run_started",
  "run_completed",
  "approval_required",
  "approval_resolved",
  "agent_failed",
]);

const clockTime = (iso: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

export const ExecutionTimeline = ({
  log,
  onSelectNode,
  className = "",
}: {
  log: ExecutionLogEntry[];
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}) => {
  // Elapsed offsets make the shape of the run legible: which stage was slow,
  // where agents ran in parallel.
  const withOffsets = useMemo(() => {
    if (!log.length) return [];
    const origin = new Date(log[0].at).getTime();
    return log.map((entry) => {
      const at = new Date(entry.at).getTime();
      const offset = Number.isNaN(at) || Number.isNaN(origin) ? null : (at - origin) / 1000;
      return { entry, offset };
    });
  }, [log]);

  if (!log.length) {
    return (
      <div className={className}>
        <Eyebrow>Execution timeline</Eyebrow>
        <Empty>The timeline fills in as the run progresses.</Empty>
      </div>
    );
  }

  return (
    <div className={className}>
      <Eyebrow>Execution timeline</Eyebrow>

      <ol className="mt-3">
        {withOffsets.map(({ entry, offset }) => {
          const emphasised = EMPHASISED.has(entry.kind);
          const clickable = Boolean(entry.nodeId && onSelectNode);

          const content = (
            <>
              <span className="w-[62px] shrink-0 text-[11px] tabular-nums text-[var(--ink-3)]">
                {clockTime(entry.at)}
              </span>
              <span className="w-[52px] shrink-0 text-right text-[11px] tabular-nums text-[var(--ink-3)]">
                {offset === null ? "" : `+${offset.toFixed(1)}s`}
              </span>
              <span
                className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${
                  emphasised ? "text-[var(--ink-1)]" : "text-[var(--ink-2)]"
                }`}
              >
                {entry.message}
              </span>
            </>
          );

          return (
            <li key={entry.id} className="border-b border-[var(--rule)] last:border-b-0">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelectNode?.(entry.nodeId as string)}
                  className="flex w-full items-baseline gap-3 py-2 text-left transition-colors hover:bg-[var(--band)]"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-baseline gap-3 py-2">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default ExecutionTimeline;
