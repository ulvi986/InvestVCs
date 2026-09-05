// The live agent graph.
//
// This is the product's central claim made visible: the analyst is not one
// prompt, it is a pipeline of specialised agents, and you can watch which one
// is working, what it produced, where it failed, and where it stopped to ask
// you something.
//
// Everything drawn here comes from workflow state the service emitted. When a
// node pulses, an agent is genuinely executing; when a particle travels an
// edge, a completed agent's output is genuinely feeding the next one. Nothing
// animates on a timer.
//
// Layout is computed from the node layers the service sends, so adding a
// methodology changes the picture without touching this file.

import { useMemo } from "react";
import type { AgentGraphData, GraphNode, NodeStatus } from "@/lib/analyst/graphTypes";
import { graphColumns } from "@/lib/analyst/graphTypes";

const NODE_W = 184;
const NODE_H = 52;
const ROW_GAP = 12;
const COL_GAP = 64;
const SUB_GAP = 14;
const PAD_X = 18;
const PAD_Y = 24;
/** Above this, a layer wraps into sub-columns so the canvas stays readable. */
const MAX_ROWS = 6;

const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "var(--graph-idle)",
  queued: "var(--graph-queued)",
  running: "var(--graph-running)",
  completed: "var(--graph-done)",
  failed: "var(--graph-failed)",
  skipped: "var(--graph-idle)",
  awaiting_approval: "var(--graph-approval)",
};

/** Colour never carries status alone. Each state also gets a shape. */
const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "waiting",
  queued: "queued",
  running: "running",
  completed: "done",
  failed: "failed",
  skipped: "not applied",
  awaiting_approval: "needs you",
};

interface Placed {
  node: GraphNode;
  x: number;
  y: number;
}

interface Layout {
  placed: Placed[];
  byId: Map<string, Placed>;
  width: number;
  height: number;
}

function layout(graph: AgentGraphData): Layout {
  const columns = graphColumns(graph);
  const placed: Placed[] = [];

  // Tallest stack in the graph, so every column can be centred against it.
  const tallest = Math.max(1, ...columns.map((nodes) => Math.min(nodes.length, MAX_ROWS)));
  const contentHeight = tallest * NODE_H + (tallest - 1) * ROW_GAP;

  let cursorX = PAD_X;
  columns.forEach((nodes) => {
    const subColumns = Math.ceil(nodes.length / MAX_ROWS);
    const perColumn = Math.ceil(nodes.length / subColumns);

    for (let sub = 0; sub < subColumns; sub++) {
      const slice = nodes.slice(sub * perColumn, (sub + 1) * perColumn);
      const stackHeight = slice.length * NODE_H + (slice.length - 1) * ROW_GAP;
      const startY = PAD_Y + (contentHeight - stackHeight) / 2;

      slice.forEach((node, row) => {
        placed.push({
          node,
          x: cursorX + sub * (NODE_W + SUB_GAP),
          y: startY + row * (NODE_H + ROW_GAP),
        });
      });
    }

    cursorX += subColumns * NODE_W + (subColumns - 1) * SUB_GAP + COL_GAP;
  });

  return {
    placed,
    byId: new Map(placed.map((item) => [item.node.id, item])),
    width: Math.max(cursorX - COL_GAP + PAD_X, 320),
    height: contentHeight + PAD_Y * 2,
  };
}

/** Horizontal bezier between two node edges. */
function edgePath(from: Placed, to: Placed): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const curve = Math.max(20, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
}

/** Feedback edges loop underneath so they never overlap the forward flow. */
function feedbackPath(from: Placed, to: Placed, height: number): string {
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y + NODE_H;
  const drop = height - Math.max(y1, y2) + 14;
  return `M ${x1} ${y1} C ${x1} ${y1 + drop}, ${x2} ${y2 + drop}, ${x2} ${y2}`;
}

/**
 * Status mark: a distinct glyph per state, so the graph reads without colour.
 * Drawn at the node's leading edge.
 */
const StatusMark = ({ status, color }: { status: NodeStatus; color: string }) => {
  const cx = 16;
  const cy = NODE_H / 2;

  if (status === "completed") {
    return (
      <path
        d={`M ${cx - 4} ${cy} l 3 3.4 l 5.4 -6.8`}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (status === "failed") {
    return (
      <g stroke={color} strokeWidth={1.8} strokeLinecap="round">
        <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} />
        <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} />
      </g>
    );
  }

  if (status === "skipped") {
    return <line x1={cx - 4.5} y1={cy} x2={cx + 4.5} y2={cy} stroke={color} strokeWidth={1.8} strokeLinecap="round" />;
  }

  if (status === "awaiting_approval") {
    // A pause bar: the run is stopped and will not move without a person.
    return (
      <g fill={color}>
        <rect x={cx - 4} y={cy - 4.5} width={2.6} height={9} rx={1} />
        <rect x={cx + 1.4} y={cy - 4.5} width={2.6} height={9} rx={1} />
      </g>
    );
  }

  if (status === "running") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={4.5} fill="none" stroke={color} strokeWidth={1.6} opacity={0.3} />
        <circle cx={cx} cy={cy} r={4.5} fill="none" stroke={color} strokeWidth={1.6}
          strokeDasharray="7 21" strokeLinecap="round" className="node-running" />
      </g>
    );
  }

  // idle and queued
  return (
    <circle cx={cx} cy={cy} r={3.6} fill="none" stroke={color} strokeWidth={1.4}
      strokeDasharray={status === "queued" ? "2 2.4" : undefined} />
  );
};

const NodeCard = ({
  placed, onSelect, selected,
}: {
  placed: Placed;
  onSelect: (node: GraphNode) => void;
  selected: boolean;
}) => {
  const { node, x, y } = placed;
  const color = STATUS_COLOR[node.status];
  const dim = node.status === "idle" || node.status === "skipped";
  const emphasised = node.status === "running" || node.status === "awaiting_approval";

  const subtitle =
    node.status === "running"
      ? "working"
      : node.status === "awaiting_approval"
        ? "approval required"
        : node.headline || STATUS_LABEL[node.status];

  return (
    <g
      transform={`translate(${x} ${y})`}
      className="cursor-pointer"
      onClick={() => onSelect(node)}
      role="listitem"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(node);
        }
      }}
      aria-label={`${node.label}, ${STATUS_LABEL[node.status]}`}
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={5}
        className="transition-[fill,stroke] duration-200"
        fill={selected ? "var(--graph-node-selected)" : "var(--graph-node)"}
        stroke={selected || emphasised ? color : dim ? "var(--graph-border-dim)" : "var(--graph-border)"}
        strokeWidth={selected || emphasised ? 1.5 : 1}
      />

      {node.status === "awaiting_approval" && (
        <rect
          width={NODE_W}
          height={NODE_H}
          rx={5}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          className="node-awaiting"
        />
      )}

      <StatusMark status={node.status} color={color} />

      <text
        x={32}
        y={22}
        className="select-none text-[11.5px] font-medium"
        fill={dim ? "var(--graph-text-dim)" : "var(--graph-text)"}
      >
        {node.label.length > 23 ? `${node.label.slice(0, 22)}…` : node.label}
      </text>

      <text x={32} y={37} className="select-none text-[10px] tabular-nums" fill="var(--graph-text-dim)">
        {subtitle.length > 26 ? `${subtitle.slice(0, 25)}…` : subtitle}
      </text>

      {node.confidence !== null && node.status === "completed" && (
        <text
          x={NODE_W - 12}
          y={37}
          textAnchor="end"
          className="select-none text-[10px] tabular-nums"
          fill="var(--graph-text-dim)"
        >
          {node.confidence.toFixed(2)}
        </text>
      )}

      {/* A checkpoint the workflow declares, before it is reached. */}
      {node.requiresApproval && node.status !== "awaiting_approval" && (
        <circle cx={NODE_W - 11} cy={13} r={2.6} fill="none"
          stroke="var(--graph-approval)" strokeWidth={1.3} />
      )}

      {node.iteration > 0 && (
        <text x={NODE_W - 11} y={17} textAnchor="end"
          className="select-none text-[9px] tabular-nums" fill="var(--graph-text-dim)">
          {`↻${node.iteration}`}
        </text>
      )}
    </g>
  );
};

export interface AgentGraphProps {
  graph: AgentGraphData;
  statusMessage?: string;
  running?: boolean;
  /** Id of the node the inspector is showing, if any. */
  selectedId?: string | null;
  onSelect?: (node: GraphNode | null) => void;
}

export const AgentGraph = ({
  graph, statusMessage, running, selectedId = null, onSelect,
}: AgentGraphProps) => {
  const computed = useMemo(() => layout(graph), [graph]);

  if (!graph.nodes.length) return null;

  const applicable = graph.nodes.filter((node) => node.status !== "skipped");
  const done = graph.nodes.filter((node) => node.status === "completed").length;
  const waiting = graph.nodes.some((node) => node.status === "awaiting_approval");

  const select = (node: GraphNode) =>
    onSelect?.(selectedId === node.id ? null : node);

  return (
    <div className="graph-surface h-full w-full overflow-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1
                      border-b border-[var(--rule)] bg-[color-mix(in_srgb,var(--page)_92%,transparent)] px-5 py-3 backdrop-blur-[2px]">
        <p className="kicker">Agent pipeline</p>
        <p className="text-[12.5px] text-[var(--ink-2)]" role="status" aria-live="polite">
          {waiting
            ? "Paused. The run is waiting on your decision."
            : running
              ? statusMessage || "Working"
              : `${done} of ${applicable.length} stages complete`}
        </p>
      </div>

      <div className="p-5">
        <svg
          viewBox={`0 0 ${computed.width} ${computed.height}`}
          width={computed.width}
          height={computed.height}
          className="max-w-none"
          role="list"
          aria-label="Investment analysis agent pipeline"
        >
          <g>
            {graph.edges.map((edge, index) => {
              const from = computed.byId.get(edge.source);
              const to = computed.byId.get(edge.target);
              if (!from || !to) return null;

              const feedback = edge.kind === "feedback";
              // An edge is live when its source has produced something and its
              // target is consuming it.
              const flowing =
                !feedback &&
                from.node.status === "completed" &&
                (to.node.status === "running" || to.node.status === "queued");
              const settled = !feedback && from.node.status === "completed" && to.node.status === "completed";
              const d = feedback ? feedbackPath(from, to, computed.height) : edgePath(from, to);

              return (
                <g key={`${edge.source}-${edge.target}-${index}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={flowing ? "var(--graph-running)" : settled ? "var(--graph-edge-done)" : "var(--graph-edge)"}
                    strokeWidth={flowing ? 1.5 : 1}
                    strokeDasharray={feedback ? "3 4" : flowing ? "5 5" : undefined}
                    className={flowing ? "edge-active" : undefined}
                    opacity={feedback ? 0.45 : 1}
                  />
                  {/* The signature motion: output physically moving between
                      agents. Only drawn on edges that are actually carrying. */}
                  {flowing && (
                    <circle
                      r={2.4}
                      fill="var(--graph-running)"
                      className="edge-particle"
                      style={{ offsetPath: `path("${d}")` }}
                    />
                  )}
                </g>
              );
            })}
          </g>

          <g>
            {computed.placed.map((placed) => (
              <NodeCard
                key={placed.node.id}
                placed={placed}
                selected={selectedId === placed.node.id}
                onSelect={select}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default AgentGraph;
