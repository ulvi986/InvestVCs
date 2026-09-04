"""Workflow as a first-class object.

A workflow is the executable plan: which agents run, in what order, what tools
each may use, and where a human has to approve before execution continues.

It exists separately from the orchestrator so that

  * the frontend can render and edit a workflow before it runs,
  * the orchestrator has one thing to execute rather than a hardcoded sequence,
  * and templates can be saved and reused.

The graph the UI draws is derived from this, so the picture is always the plan
that actually ran.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional

from . import registry

NodeKind = Literal[
    "input", "understand", "planner", "methodology",
    "critic", "reconcile", "synthesis", "report", "approval",
]

#: Capabilities an agent may draw on. Reported per node so the inspector can
#: show what a result was actually built from.
Tool = Literal[
    "deck_extract", "founder_narrative", "business_model_canvas",
    "financial_snapshot", "founder_answers", "methodology_registry",
    "deterministic_compute", "comparables_knowledge", "sector_knowledge",
    "cross_validation", "evidence_ledger",
]

TOOL_LABELS: dict[str, str] = {
    "deck_extract": "Pitch deck extract",
    "founder_narrative": "Founder narrative",
    "business_model_canvas": "Business Model Canvas",
    "financial_snapshot": "Financial snapshot",
    "founder_answers": "Founder answers & corrections",
    "methodology_registry": "Methodology registry",
    "deterministic_compute": "Deterministic compute",
    "comparables_knowledge": "Comparables knowledge",
    "sector_knowledge": "Sector knowledge",
    "cross_validation": "Cross-validation",
    "evidence_ledger": "Evidence ledger",
}

#: Which tools each methodology draws on. Declared here rather than on the
#: spec so a methodology stays a pure analytical unit.
METHODOLOGY_TOOLS: dict[str, list[str]] = {
    "market_analysis": ["deck_extract", "founder_narrative", "sector_knowledge"],
    "competitive_analysis": ["deck_extract", "sector_knowledge"],
    "team_traction": ["deck_extract", "founder_narrative"],
    "business_model_canvas": ["business_model_canvas", "deck_extract"],
    "readiness_levels": ["deck_extract", "founder_answers", "deterministic_compute"],
    "financial_analysis": ["financial_snapshot", "deterministic_compute"],
    "berkus": ["deck_extract", "methodology_registry", "deterministic_compute"],
    "scorecard": ["comparables_knowledge", "methodology_registry", "deterministic_compute"],
    "risk_factor": ["comparables_knowledge", "methodology_registry", "deterministic_compute"],
    "vc_method": ["financial_snapshot", "comparables_knowledge", "deterministic_compute"],
    "first_chicago": ["financial_snapshot", "comparables_knowledge", "deterministic_compute"],
    "risk_analysis": ["deck_extract", "financial_snapshot", "evidence_ledger"],
}

CORE_TOOLS: dict[str, list[str]] = {
    "understand": ["deck_extract", "founder_narrative", "business_model_canvas", "financial_snapshot", "founder_answers"],
    "select": ["methodology_registry"],
    "critic": ["cross_validation", "evidence_ledger"],
    "reconcile": ["deterministic_compute", "cross_validation"],
    "synthesis": ["evidence_ledger"],
}


@dataclass
class WorkflowNode:
    id: str
    label: str
    kind: NodeKind
    layer: int
    #: Agent or methodology this node executes. None for structural nodes.
    agent: Optional[str] = None
    tools: list[str] = field(default_factory=list)
    #: Pause here and wait for a human before continuing.
    requires_approval: bool = False
    #: Why this node is in the workflow — shown in the inspector.
    rationale: str = ""
    family: Optional[str] = None
    detail: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "kind": self.kind,
            "layer": self.layer,
            "agent": self.agent,
            "tools": self.tools,
            "toolLabels": [TOOL_LABELS.get(tool, tool) for tool in self.tools],
            "requiresApproval": self.requires_approval,
            "rationale": self.rationale,
            "family": self.family,
            "detail": self.detail,
        }


@dataclass
class WorkflowEdge:
    source: str
    target: str
    kind: Literal["flow", "feedback"] = "flow"

    def to_dict(self) -> dict[str, Any]:
        return {"source": self.source, "target": self.target, "kind": self.kind}


@dataclass
class Workflow:
    id: str
    name: str
    goal: str
    nodes: list[WorkflowNode] = field(default_factory=list)
    edges: list[WorkflowEdge] = field(default_factory=list)
    #: "orchestrator" when the AI built it, "user" when edited, "template" otherwise.
    origin: str = "orchestrator"
    strategy: str = ""

    def node(self, node_id: str) -> Optional[WorkflowNode]:
        return next((node for node in self.nodes if node.id == node_id), None)

    def methodology_ids(self) -> list[str]:
        return [node.agent for node in self.nodes if node.kind == "methodology" and node.agent]

    def approval_nodes(self) -> list[WorkflowNode]:
        return [node for node in self.nodes if node.requires_approval]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "goal": self.goal,
            "origin": self.origin,
            "strategy": self.strategy,
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
        }


METHODOLOGY_NODE_PREFIX = "methodology:"


def methodology_node_id(methodology_id: str) -> str:
    return f"{METHODOLOGY_NODE_PREFIX}{methodology_id}"


def build_workflow(
    *,
    workflow_id: str = "startup_evaluation",
    name: str = "Startup evaluation",
    goal: str = "Evaluate this startup and reach an investment recommendation.",
    methodology_ids: Optional[list[str]] = None,
    approvals: Optional[list[str]] = None,
    origin: str = "orchestrator",
    strategy: str = "",
) -> Workflow:
    """Assemble the standard evaluation workflow.

    Before planning, every registry methodology is included so the user can see
    the analyst's whole instrument set; afterwards the orchestrator narrows it.
    """
    ids = methodology_ids if methodology_ids is not None else [spec.id for spec in registry.active()]
    approval_set = set(approvals or [])

    workflow = Workflow(id=workflow_id, name=name, goal=goal, origin=origin, strategy=strategy)

    workflow.nodes.append(WorkflowNode(
        "input", "Startup input", "input", 0,
        tools=["deck_extract", "founder_narrative", "business_model_canvas", "financial_snapshot"],
        detail="Deck, description and existing InvestVCS data",
    ))
    workflow.nodes.append(WorkflowNode(
        "understand", "Startup understanding", "understand", 1,
        agent="understand", tools=CORE_TOOLS["understand"],
        requires_approval="understand" in approval_set,
        rationale="Extracts the structured profile every later agent reads from.",
    ))
    workflow.nodes.append(WorkflowNode(
        "select", "Methodology selection", "planner", 2,
        agent="select", tools=CORE_TOOLS["select"],
        requires_approval="select" in approval_set,
        rationale="Chooses which methodologies this company's stage and data can support.",
    ))

    workflow.edges.append(WorkflowEdge("input", "understand"))
    workflow.edges.append(WorkflowEdge("understand", "select"))

    for methodology_id in ids:
        spec = registry.get(methodology_id)
        if spec is None:
            continue
        node_id = methodology_node_id(methodology_id)
        workflow.nodes.append(WorkflowNode(
            node_id, spec.name, "methodology", 3,
            agent=methodology_id,
            tools=METHODOLOGY_TOOLS.get(methodology_id, ["deck_extract"]),
            requires_approval=node_id in approval_set or methodology_id in approval_set,
            rationale=spec.purpose,
            family=spec.family,
            detail=spec.purpose,
        ))
        workflow.edges.append(WorkflowEdge("select", node_id))
        workflow.edges.append(WorkflowEdge(node_id, "critic"))

    workflow.nodes.append(WorkflowNode(
        "critic", "Cross-validation & critique", "critic", 4,
        agent="critic", tools=CORE_TOOLS["critic"],
        requires_approval="critic" in approval_set,
        rationale="Challenges the results and explains where methodologies disagree.",
    ))
    workflow.nodes.append(WorkflowNode(
        "reconcile", "Valuation reconciliation", "reconcile", 5,
        tools=CORE_TOOLS["reconcile"],
        requires_approval="reconcile" in approval_set,
        rationale="Weighted, outlier-aware — never an average.",
        detail="Weighted, outlier-aware — never an average",
    ))
    workflow.nodes.append(WorkflowNode(
        "synthesis", "Investment thesis", "synthesis", 6,
        agent="synthesis", tools=CORE_TOOLS["synthesis"],
        requires_approval="synthesis" in approval_set,
        rationale="Writes the memo from validated evidence only.",
    ))
    workflow.nodes.append(WorkflowNode("report", "Investment report", "report", 7))

    workflow.edges.append(WorkflowEdge("critic", "reconcile"))
    workflow.edges.append(WorkflowEdge("reconcile", "synthesis"))
    workflow.edges.append(WorkflowEdge("synthesis", "report"))
    # The revise loop: the critic can send specific methodologies back.
    workflow.edges.append(WorkflowEdge("critic", "select", kind="feedback"))

    return workflow


#: Saved starting points the user can pick or edit.
TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "full_evaluation",
        "name": "Full evaluation",
        "goal": "Evaluate this startup end to end and reach an investment recommendation.",
        "description": "Every applicable methodology, cross-validated, with a full investment memo.",
        "methodologyIds": None,
        "approvals": [],
    },
    {
        "id": "valuation_only",
        "name": "Valuation only",
        "goal": "Establish a defensible valuation range for this startup.",
        "description": "The valuation methodologies plus the risk enumeration a range has to account for.",
        "methodologyIds": ["berkus", "scorecard", "risk_factor", "vc_method", "first_chicago", "risk_analysis"],
        "approvals": [],
    },
    {
        "id": "diligence_screen",
        "name": "Diligence screen",
        "goal": "Screen this startup for the risks and gaps that would stop a deal.",
        "description": "Market, competition, financials and risk, with a human checkpoint before the thesis.",
        "methodologyIds": ["market_analysis", "competitive_analysis", "financial_analysis", "risk_analysis"],
        "approvals": ["critic"],
    },
    {
        "id": "deep_tech",
        "name": "Deep-tech assessment",
        "goal": "Assess technology maturity and technical risk alongside the commercial case.",
        "description": "Weighted towards readiness levels and technical defensibility.",
        "methodologyIds": [
            "readiness_levels", "competitive_analysis", "market_analysis",
            "team_traction", "berkus", "risk_analysis",
        ],
        "approvals": ["understand"],
    },
]


def template(template_id: str) -> Optional[dict[str, Any]]:
    return next((item for item in TEMPLATES if item["id"] == template_id), None)


def workflow_from_template(template_id: str) -> Optional[Workflow]:
    spec = template(template_id)
    if spec is None:
        return None
    return build_workflow(
        workflow_id=spec["id"],
        name=spec["name"],
        goal=spec["goal"],
        methodology_ids=spec["methodologyIds"],
        approvals=spec["approvals"],
        origin="template",
        strategy=spec["description"],
    )
