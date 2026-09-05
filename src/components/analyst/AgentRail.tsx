// The agent rail.
//
// Sits to the right of the graph and is where you actually watch the run: every
// agent, its live status, what it produced. The graph shows the shape of the
// workflow; this shows the roster working through it, which is easier to read
// at a glance when twelve agents are in flight at once.
//
// Selecting an agent here and selecting a node in the graph are the same
// action, so the two stay in step.

import { useMemo } from "react";
import type { AgentGraphData, GraphNode, NodeStatus } from "@/lib/analyst/graphTypes";
import type { MethodologyResult } from "@/lib/analyst/types";
import type { ExecutionLogEntry } from "@/lib/analyst/graphTypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentInspector from "./AgentInspector";
import ExecutionTimeline from "./ExecutionTimeline";
import { StatusIcon, formatDuration } from "./primitives";

const STATUS_TEXT: Record<NodeStatus, string> = {
  idle: "waiting",
  queued: "queued",
  running: "running",
  completed: "done",
  failed: "failed",
  skipped: "not applied",
  awaiting_approval: "needs you",
};

/** Running first, then anything that needs a person, then the rest in order. */
const ORDER: NodeStatus[] = [
  "awaiting_approval", "running", "queued", "completed", "failed", "idle", "skipped",
];

const AgentRow = ({
  node, selected, onSelect,
}: {
  node: GraphNode;
  selected: boolean;
  onSelect: () => void;
}) => {
  const dim = node.status === "idle" || node.status === "skipped";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={`flex w-full items-start gap-2.5 border-b border-[var(--rule)] px-4 py-2.5 text-left
                    transition-colors hover:bg-[var(--band)] ${selected ? "bg-[var(--accent-wash)]" : ""}`}
      >
        <span className="mt-0.5 shrink-0">
          <StatusIcon status={node.status} />
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13px] ${dim ? "text-[var(--ink-3)]" : "text-[var(--ink-1)]"}`}>
            {node.label}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--ink-3)]">
            {node.status === "running"
              ? "working"
              : node.status === "awaiting_approval"
                ? "approval required"
                : node.headline || STATUS_TEXT[node.status]}
          </span>
        </span>

        <span className="shrink-0 text-right">
          {node.confidence !== null && node.status === "completed" && (
            <span className="block text-[11.5px] tabular-nums text-[var(--ink-2)]">
              {node.confidence.toFixed(2)}
            </span>
          )}
          {node.durationMs !== null && (
            <span className="block text-[11px] tabular-nums text-[var(--ink-3)]">
              {formatDuration(node.durationMs)}
            </span>
          )}
        </span>
      </button>
    </li>
  );
};

export interface AgentRailProps {
  graph: AgentGraphData;
  selectedNode: GraphNode | null;
  selectedResult?: MethodologyResult | null;
  log: ExecutionLogEntry[];
  onSelect: (nodeId: string | null) => void;
  onRerun?: (methodologyId: string) => void;
  running?: boolean;
}

export const AgentRail = ({
  graph, selectedNode, selectedResult, log, onSelect, onRerun, running,
}: AgentRailProps) => {
  const agents = useMemo(
    () => [...graph.nodes].sort((a, b) => {
      const byStatus = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
      return byStatus !== 0 ? byStatus : a.layer - b.layer;
    }),
    [graph.nodes],
  );

  const done = graph.nodes.filter((node) => node.status === "completed").length;
  const applicable = graph.nodes.filter((node) => node.status !== "skipped").length;

  // Opening an agent replaces the roster, so the panel never needs to scroll
  // two lists at once.
  const tab = selectedNode ? "agent" : undefined;

  return (
    <Tabs
      value={tab}
      defaultValue="agents"
      onValueChange={(value) => { if (value !== "agent") onSelect(null); }}
      className="flex h-full min-h-0 flex-col"
    >
      <TabsList className="flex h-auto w-full shrink-0 justify-start gap-5 rounded-none border-b
                           border-[var(--rule)] bg-[var(--surface)] px-4 py-0">
        {[
          { value: "agents", label: "Agents" },
          { value: "timeline", label: "Timeline" },
          ...(selectedNode ? [{ value: "agent", label: "Detail" }] : []),
        ].map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-[12.5px]
                       text-[var(--ink-3)] shadow-none data-[state=active]:border-[var(--accent-ink)]
                       data-[state=active]:bg-transparent data-[state=active]:text-[var(--ink-1)]
                       data-[state=active]:shadow-none"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="agents" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--rule)] px-4 py-2.5">
          <p className="kicker">Roster</p>
          <p className="text-[11.5px] tabular-nums text-[var(--ink-3)]" role="status" aria-live="polite">
            {running ? `${done} of ${applicable} done` : `${applicable} agents`}
          </p>
        </div>

        {agents.length ? (
          <ul>
            {agents.map((node) => (
              <AgentRow
                key={node.id}
                node={node}
                selected={selectedNode?.id === node.id}
                onSelect={() => onSelect(node.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-[13px] leading-relaxed text-[var(--ink-3)]">
            The roster fills in when a workflow is built. Ask for something above, or run the analysis.
          </p>
        )}
      </TabsContent>

      <TabsContent value="timeline" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ExecutionTimeline log={log} onSelectNode={onSelect} />
      </TabsContent>

      <TabsContent value="agent" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <AgentInspector
          node={selectedNode}
          result={selectedResult}
          onClose={() => onSelect(null)}
          onRerun={onRerun}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AgentRail;
