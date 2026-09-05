// Workflow and runtime-graph shapes, mirroring `ai/app/workflow.py` and
// `ai/app/graph.py`.

export type NodeKind =
  | "input" | "understand" | "planner" | "methodology"
  | "critic" | "reconcile" | "synthesis" | "report" | "approval";

export type NodeStatus =
  | "idle" | "queued" | "running" | "completed" | "failed" | "skipped" | "awaiting_approval";

export type EdgeKind = "flow" | "feedback";

/** Runtime state of one node. */
export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Execution depth; nodes sharing a layer run in parallel. */
  layer: number;
  status: NodeStatus;
  detail: string;
  family: string | null;
  confidence: number | null;
  durationMs: number | null;
  iteration: number;
  error: string | null;
  /** Headline figure — a valuation, a 0-10 score, or a verdict. */
  headline: string;
  /** Capabilities this node may draw on. */
  tools: string[];
  toolLabels: string[];
  requiresApproval: boolean;
  rationale: string;
  /** Counts and figures for the inspector, filled in once the node has run. */
  summary: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface AgentGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** The editable plan, as opposed to its runtime state. */
export interface WorkflowNodeSpec {
  id: string;
  label: string;
  kind: NodeKind;
  layer: number;
  agent: string | null;
  tools: string[];
  toolLabels: string[];
  requiresApproval: boolean;
  rationale: string;
  family: string | null;
  detail: string;
}

export interface WorkflowSpec {
  id: string;
  name: string;
  goal: string;
  origin: "orchestrator" | "user" | "template" | string;
  strategy: string;
  nodes: WorkflowNodeSpec[];
  edges: GraphEdge[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  goal: string;
  description: string;
  methodologyIds: string[] | null;
  approvals: string[];
  workflow: WorkflowSpec;
}

export interface ExecutionLogEntry {
  id: string;
  at: string;
  kind:
    | "run_started" | "run_completed" | "stage" | "agent_started"
    | "agent_completed" | "agent_failed" | "approval_required"
    | "approval_resolved" | "reconciled" | string;
  message: string;
  nodeId: string | null;
}

export interface ApprovalRequest {
  runId: string;
  nodeId: string;
  label: string;
  question: string;
  payload: Record<string, unknown>;
}

export const METHODOLOGY_NODE_PREFIX = "methodology:";

export const methodologyIdFromNode = (nodeId: string): string | null =>
  nodeId.startsWith(METHODOLOGY_NODE_PREFIX) ? nodeId.slice(METHODOLOGY_NODE_PREFIX.length) : null;

export const emptyGraph = (): AgentGraphData => ({ nodes: [], edges: [] });

/** Apply a streamed node update, preserving node order. */
export function applyNodeUpdate(graph: AgentGraphData, node: GraphNode): AgentGraphData {
  const index = graph.nodes.findIndex((existing) => existing.id === node.id);
  if (index === -1) return { ...graph, nodes: [...graph.nodes, node] };
  const nodes = [...graph.nodes];
  nodes[index] = node;
  return { ...graph, nodes };
}

/** Nodes grouped by layer, in execution order — the shape the canvas draws. */
export function graphColumns(graph: AgentGraphData): GraphNode[][] {
  const byLayer = new Map<number, GraphNode[]>();
  graph.nodes.forEach((node) => {
    const bucket = byLayer.get(node.layer);
    if (bucket) bucket.push(node);
    else byLayer.set(node.layer, [node]);
  });
  return [...byLayer.entries()].sort(([a], [b]) => a - b).map(([, nodes]) => nodes);
}

export const isActive = (status: NodeStatus): boolean =>
  status === "running" || status === "awaiting_approval";

export const isSettled = (status: NodeStatus): boolean =>
  status === "completed" || status === "failed" || status === "skipped";

/** Project a workflow spec into an idle runtime graph, for the builder preview. */
export function graphFromWorkflow(workflow: WorkflowSpec): AgentGraphData {
  return {
    nodes: workflow.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      layer: node.layer,
      status: "idle" as NodeStatus,
      detail: node.detail || node.rationale,
      family: node.family,
      confidence: null,
      durationMs: null,
      iteration: 0,
      error: null,
      headline: "",
      tools: node.tools,
      toolLabels: node.toolLabels ?? [],
      requiresApproval: node.requiresApproval,
      rationale: node.rationale,
      summary: {},
    })),
    edges: workflow.edges,
  };
}
