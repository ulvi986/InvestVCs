// Agent inspector.
//
// Opening a node answers two questions: what was this agent asked to do, and
// what did it actually work from. Everything shown is reported by the service
// with the node; nothing is inferred here, so an empty field means the run did
// not produce that value rather than that the panel could not find it.

import type { GraphNode, NodeStatus } from "@/lib/analyst/graphTypes";
import type { MethodologyResult } from "@/lib/analyst/types";
import { methodologyIdFromNode } from "@/lib/analyst/graphTypes";
import { ConfidenceMeter, Eyebrow, Row, StatusIcon, Tag, formatDuration } from "./primitives";

const STATUS_TEXT: Record<NodeStatus, string> = {
  idle: "Waiting",
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  skipped: "Not applied",
  awaiting_approval: "Waiting for approval",
};

const KIND_TEXT: Record<string, string> = {
  input: "Input",
  understand: "Understanding agent",
  planner: "Planning agent",
  methodology: "Methodology agent",
  critic: "Verification agent",
  reconcile: "Reconciliation",
  synthesis: "Thesis agent",
  report: "Report",
  approval: "Human checkpoint",
};

/** Written output an agent produced, in the order a reader wants it: what it
 *  concluded, what it established, what worries it, what it could not settle.
 *
 *  A user-defined agent has no deterministic figures to show, so without this
 *  its entire answer would be reduced to a headline and a score. Built-ins that
 *  fill the same keys - risk analysis writes unknowns, the canvas writes an
 *  assessment - get the same treatment rather than a special case. */
const NARRATIVE_FIELDS: { key: string; label: string }[] = [
  { key: "findings", label: "What it established" },
  { key: "concerns", label: "What worries it" },
  { key: "unknowns", label: "What it could not establish" },
];

const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];

/** Values the orchestrator attached to the node, rendered as they arrive. */
const SUMMARY_LABEL: Record<string, string> = {
  sources: "Sources",
  evidenceCount: "Evidence items",
  claims: "Claims checked",
  methodologies: "Methodologies",
  selected: "Selected",
  considered: "Considered",
  disagreements: "Disagreements",
  risks: "Risks identified",
  valuation: "Valuation",
  score: "Score",
  stage: "Stage",
  sector: "Sector",
};

const readableKey = (key: string) =>
  SUMMARY_LABEL[key] ??
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

const readableValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "object") return "";
  return String(value);
};

export interface AgentInspectorProps {
  node: GraphNode | null;
  /** The full methodology result, when the node ran one. */
  result?: MethodologyResult | null;
  onClose: () => void;
  onRerun?: (methodologyId: string) => void;
}

export const AgentInspector = ({ node, result, onClose, onRerun }: AgentInspectorProps) => {
  if (!node) {
    return (
      <div className="flex h-full items-center px-5 py-8">
        <p className="text-[13px] leading-relaxed text-[var(--ink-3)]">
          Select an agent in the graph to see what it was asked to do, which tools it drew on, and what it produced.
        </p>
      </div>
    );
  }

  const methodologyId = methodologyIdFromNode(node.id);
  const summaryRows = Object.entries(node.summary ?? {})
    .map(([key, value]) => [readableKey(key), readableValue(value)] as const)
    .filter(([, value]) => value !== "");

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-[var(--rule)] bg-[var(--surface)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">{KIND_TEXT[node.kind] ?? node.kind}</p>
            <h3 className="mt-1.5 text-[15px] font-medium leading-tight text-[var(--ink-1)]">{node.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[12px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
            <StatusIcon status={node.status} />
            {STATUS_TEXT[node.status]}
          </span>
          {node.durationMs !== null && (
            <span className="text-[12px] tabular-nums text-[var(--ink-3)]">{formatDuration(node.durationMs)}</span>
          )}
          {node.iteration > 0 && (
            <span className="text-[12px] tabular-nums text-[var(--ink-3)]">Rerun {node.iteration}</span>
          )}
          {node.requiresApproval && <Tag tone="muted">Checkpoint</Tag>}
        </div>
      </div>

      <div className="space-y-6 px-5 py-5">
        {/* Why the orchestrator put this node in the workflow. */}
        {node.rationale && (
          <section>
            <Eyebrow>Task</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">{node.rationale}</p>
          </section>
        )}

        {node.error && (
          <section>
            <Eyebrow>Failure</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--negative)]">{node.error}</p>
          </section>
        )}

        {node.headline && node.status === "completed" && (
          <section>
            <Eyebrow>Output</Eyebrow>
            <p className="mt-2 text-[15px] leading-snug text-[var(--ink-1)]">{node.headline}</p>
          </section>
        )}

        {node.detail && node.detail !== node.rationale && (
          <section>
            <Eyebrow>Detail</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">{node.detail}</p>
          </section>
        )}

        {node.confidence !== null && (
          <section>
            <Eyebrow>Confidence</Eyebrow>
            <div className="mt-2">
              <ConfidenceMeter value={node.confidence} />
            </div>
          </section>
        )}

        {/* What the agent was allowed to draw on. */}
        {node.toolLabels?.length > 0 && (
          <section>
            <Eyebrow>Tools</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {node.toolLabels.map((tool) => (
                <Tag key={tool} tone="muted">{tool}</Tag>
              ))}
            </div>
          </section>
        )}

        {typeof result?.inputs?.assessment === "string" && result.inputs.assessment.trim() && (
          <section>
            <Eyebrow>Assessment</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
              {(result.inputs.assessment as string).trim()}
            </p>
          </section>
        )}

        {NARRATIVE_FIELDS.map(({ key, label }) => {
          const items = asStringList(result?.inputs?.[key]);
          if (!items.length) return null;
          return (
            <section key={key}>
              <Eyebrow>{label}</Eyebrow>
              <ul className="mt-2 space-y-2">
                {items.map((item, index) => (
                  <li key={index} className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {summaryRows.length > 0 && (
          <section>
            <Eyebrow>Figures</Eyebrow>
            <div className="mt-1">
              {summaryRows.map(([label, value]) => (
                <Row key={label} label={label} value={value} />
              ))}
            </div>
          </section>
        )}

        {/* Evidence is the answer to "how did it reach this". */}
        {result?.evidence?.length ? (
          <section>
            <Eyebrow>Evidence</Eyebrow>
            <ul className="mt-2 space-y-2.5">
              {result.evidence.slice(0, 8).map((item, index) => (
                <li key={index} className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                  <span className="text-[var(--ink-1)]">{item.claim}</span>
                  {item.source && (
                    <span className="text-[var(--ink-3)]"> {item.source}</span>
                  )}
                </li>
              ))}
            </ul>
            {result.evidence.length > 8 && (
              <p className="mt-2 text-[12px] text-[var(--ink-3)]">
                {result.evidence.length - 8} more in the full result.
              </p>
            )}
          </section>
        ) : null}

        {methodologyId && onRerun && node.status !== "running" && (
          <button
            type="button"
            onClick={() => onRerun(methodologyId)}
            className="text-[12.5px] text-[var(--accent-ink)] underline-offset-4 transition-colors hover:underline"
          >
            Run this methodology again
          </button>
        )}
      </div>
    </div>
  );
};

export default AgentInspector;
