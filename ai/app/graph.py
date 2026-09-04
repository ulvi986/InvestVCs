"""Runtime state of a workflow.

`workflow.py` describes the plan; this describes what is happening to it right
now. The frontend draws this, so every visual state the user sees corresponds
to a real execution state rather than an animation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional

from .workflow import METHODOLOGY_NODE_PREFIX, TOOL_LABELS, Workflow, build_workflow, methodology_node_id

NodeKind = Literal[
    "input", "understand", "planner", "methodology",
    "critic", "reconcile", "synthesis", "report", "approval",
]
NodeStatus = Literal["idle", "queued", "running", "completed", "failed", "skipped", "awaiting_approval"]
EdgeKind = Literal["flow", "feedback"]

__all__ = [
    "AgentGraph", "GraphEdge", "GraphNode", "NodeKind", "NodeStatus",
    "METHODOLOGY_NODE_PREFIX", "methodology_node_id", "build_graph",
]


@dataclass
class GraphNode:
    id: str
    label: str
    kind: NodeKind
    layer: int
    status: NodeStatus = "idle"
    #: Short line shown under the label while the node is active.
    detail: str = ""
    family: Optional[str] = None
    confidence: Optional[float] = None
    duration_ms: Optional[int] = None
    iteration: int = 0
    error: Optional[str] = None
    #: Headline figure — a valuation, a 0-10 score, or a verdict.
    headline: str = ""
    #: Capabilities this node may draw on, from the workflow.
    tools: list[str] = field(default_factory=list)
    requires_approval: bool = False
    rationale: str = ""
    #: Populated once the node has produced something the inspector can show.
    summary: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "kind": self.kind,
            "layer": self.layer,
            "status": self.status,
            "detail": self.detail,
            "family": self.family,
            "confidence": self.confidence,
            "durationMs": self.duration_ms,
            "iteration": self.iteration,
            "error": self.error,
            "headline": self.headline,
            "tools": self.tools,
            "toolLabels": [TOOL_LABELS.get(tool, tool) for tool in self.tools],
            "requiresApproval": self.requires_approval,
            "rationale": self.rationale,
            "summary": self.summary,
        }


@dataclass
class GraphEdge:
    source: str
    target: str
    kind: EdgeKind = "flow"

    def to_dict(self) -> dict[str, Any]:
        return {"source": self.source, "target": self.target, "kind": self.kind}


@dataclass
class AgentGraph:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._index: dict[str, GraphNode] = {node.id: node for node in self.nodes}

    def get(self, node_id: str) -> Optional[GraphNode]:
        return self._index.get(node_id)

    def update(self, node_id: str, **changes: Any) -> Optional[GraphNode]:
        node = self._index.get(node_id)
        if node is None:
            return None
        for key, value in changes.items():
            if hasattr(node, key):
                setattr(node, key, value)
        return node

    def to_dict(self) -> dict[str, Any]:
        return {
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
        }


def graph_for(workflow: Workflow) -> AgentGraph:
    """Project a workflow into its initial runtime state."""
    graph = AgentGraph(
        nodes=[
            GraphNode(
                id=node.id,
                label=node.label,
                kind=node.kind,
                layer=node.layer,
                detail=node.detail or node.rationale,
                family=node.family,
                tools=list(node.tools),
                requires_approval=node.requires_approval,
                rationale=node.rationale,
            )
            for node in workflow.nodes
        ],
        edges=[GraphEdge(edge.source, edge.target, edge.kind) for edge in workflow.edges],
    )
    return graph


def build_graph(methodology_ids: Optional[list[str]] = None) -> AgentGraph:
    """The default pipeline shape, before any workflow has been compiled."""
    return graph_for(build_workflow(methodology_ids=methodology_ids))
