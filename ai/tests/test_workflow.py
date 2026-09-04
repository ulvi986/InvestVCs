"""Workflow model, command compilation and human-in-the-loop checkpoints."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from app import registry
from app.commands import CommandPlan, fallback_plan
from app.graph import graph_for
from app.llm import AgentResponse, llm
from app.mock import mock_output
from app.orchestrator import Orchestrator
from app.schemas import InputBundle
from app.workflow import (
    METHODOLOGY_TOOLS, TEMPLATES, TOOL_LABELS, build_workflow,
    methodology_node_id, workflow_from_template,
)


class TestWorkflowModel:
    def test_default_workflow_shows_the_whole_instrument_set(self):
        workflow = build_workflow()
        methodology_nodes = [node for node in workflow.nodes if node.kind == "methodology"]
        assert len(methodology_nodes) == len(registry.REGISTRY)

    def test_has_the_pipeline_spine(self):
        ids = {node.id for node in build_workflow().nodes}
        assert {"input", "understand", "select", "critic", "reconcile", "synthesis", "report"} <= ids

    def test_every_agent_node_declares_its_tools(self):
        for node in build_workflow().nodes:
            if node.kind in ("methodology", "understand", "planner", "critic", "synthesis"):
                assert node.tools, f"{node.id} declares no tools"
                for tool in node.tools:
                    assert tool in TOOL_LABELS, f"{node.id} uses an unlabelled tool {tool}"

    def test_every_methodology_has_declared_tools(self):
        for spec in registry.REGISTRY:
            assert spec.id in METHODOLOGY_TOOLS, f"{spec.id} has no tool mapping"

    def test_scoping_the_methodologies_scopes_the_graph(self):
        workflow = build_workflow(methodology_ids=["berkus", "risk_analysis"])
        assert workflow.methodology_ids() == ["berkus", "risk_analysis"]
        assert len([node for node in workflow.nodes if node.kind == "methodology"]) == 2

    def test_approvals_are_marked_on_the_named_nodes(self):
        workflow = build_workflow(approvals=["understand", "methodology:berkus"])
        assert workflow.node("understand").requires_approval is True
        assert workflow.node(methodology_node_id("berkus")).requires_approval is True
        assert workflow.node("critic").requires_approval is False
        assert {node.id for node in workflow.approval_nodes()} == {"understand", methodology_node_id("berkus")}

    def test_flow_edges_move_forward_through_the_layers(self):
        workflow = build_workflow()
        index = {node.id: node for node in workflow.nodes}
        for edge in workflow.edges:
            if edge.kind == "flow":
                assert index[edge.source].layer < index[edge.target].layer, f"{edge.source} -> {edge.target}"

    def test_keeps_a_feedback_edge_for_the_revise_loop(self):
        assert any(edge.kind == "feedback" for edge in build_workflow().edges)

    def test_templates_all_build(self):
        for template in TEMPLATES:
            workflow = workflow_from_template(template["id"])
            assert workflow is not None, template["id"]
            assert workflow.origin == "template"
            assert workflow.goal

    def test_unknown_template_returns_none(self):
        assert workflow_from_template("does_not_exist") is None

    def test_graph_projects_the_workflow_faithfully(self):
        workflow = build_workflow(methodology_ids=["berkus"], approvals=["critic"])
        graph = graph_for(workflow)
        assert {node.id for node in graph.nodes} == {node.id for node in workflow.nodes}
        assert graph.get("critic").requires_approval is True
        assert graph.get(methodology_node_id("berkus")).tools == METHODOLOGY_TOOLS["berkus"]
        assert all(node.status == "idle" for node in graph.nodes)


class TestCommandRouting:
    @pytest.mark.parametrize(
        "command,intent",
        [
            ("Evaluate this startup", "evaluate"),
            ("Is this investable?", "evaluate"),
            ("Recalculate the valuation using Berkus", "valuation"),
            ("What is it worth?", "valuation"),
            ("Research the competitors of this company", "competition"),
            ("How big is the market?", "market"),
            ("Find the biggest risks", "risk"),
            ("Prepare this startup for an investment committee", "memo"),
            ("Compare these three startups", "compare"),
        ],
    )
    def test_routes_instructions_to_the_right_intent(self, command, intent):
        assert fallback_plan(command).intent == intent

    def test_a_named_methodology_wins_over_the_keyword_bucket(self):
        plan = fallback_plan("Recalculate the valuation using Berkus")
        assert "berkus" in plan.methodology_ids
        assert "vc_method" not in plan.methodology_ids

    def test_a_general_evaluation_leaves_selection_to_the_planner(self):
        assert fallback_plan("Evaluate this startup").methodology_ids == []

    def test_never_emits_an_unknown_methodology_id(self):
        for command in ["valuation", "competitors", "risks", "market", "memo", "trl readiness"]:
            for methodology_id in fallback_plan(command).methodology_ids:
                assert registry.get(methodology_id) is not None

    def test_compiles_into_a_runnable_workflow(self):
        workflow = fallback_plan("Research the competitors of this company").to_workflow()
        assert set(workflow.methodology_ids()) == {"competitive_analysis", "market_analysis", "risk_analysis"}
        assert workflow.goal

    def test_marks_itself_as_a_fallback_so_the_ui_can_say_so(self):
        assert fallback_plan("anything").fallback is True


class ApprovalHarness:
    """Model stand-in that also lets the test drive approval decisions."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    async def run(self, *, role: str, instruction: str, schema: Any, context: Any, label: str = "", temperature=None):
        self.calls.append(role)
        output = mock_output(role, context)
        if role == "select":
            output["selections"] = [
                {"methodologyId": spec.id, "selected": spec.id == "berkus", "reason": "test", "expectedConfidence": 0.7}
                for spec in registry.REGISTRY
            ]
        return AgentResponse(output=output, duration_ms=1, model="harness")


def make_bundle() -> InputBundle:
    return InputBundle(startupName="Test Co", narrative="A SaaS company selling workflow tooling to SMBs.")


@pytest.fixture
def harness(monkeypatch):
    instance = ApprovalHarness()
    monkeypatch.setattr(llm, "run", instance.run)
    return instance


async def drain(orchestrator: Orchestrator, decisions: dict[str, bool]) -> dict[str, list[Any]]:
    """Consume the stream, answering each approval as it is requested."""
    events: dict[str, list[Any]] = {}
    async for event in orchestrator.stream():
        events.setdefault(event["type"], []).append(event["payload"])
        if event["type"] == "approval_required":
            node_id = event["payload"]["nodeId"]
            approved = decisions.get(node_id, True)
            # The real caller resolves this from a separate HTTP request.
            assert orchestrator.resolve_approval(node_id, approved, "noted")
    return events


class TestHumanInTheLoop:
    async def test_pauses_at_a_checkpoint_and_resumes_on_approval(self, harness):
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=build_workflow(methodology_ids=["berkus", "risk_analysis"], approvals=["understand"]),
        )
        events = await drain(orchestrator, {})

        assert len(events["approval_required"]) == 1
        assert events["approval_required"][0]["nodeId"] == "understand"
        assert events["approval_resolved"][0]["approved"] is True
        # The run continued past the gate.
        assert events["thesis"]

    async def test_rejection_stops_the_run(self, harness):
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=build_workflow(methodology_ids=["berkus"], approvals=["understand"]),
        )
        events = await drain(orchestrator, {"understand": False})

        assert events["approval_resolved"][0]["approved"] is False
        assert "thesis" not in events
        assert "checkpoint" in events["error"][0]["message"].lower()

    async def test_declining_one_methodology_leaves_the_rest_running(self, harness):
        node_id = methodology_node_id("berkus")
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=build_workflow(
                methodology_ids=["berkus", "risk_analysis"],
                approvals=[node_id],
            ),
        )
        events = await drain(orchestrator, {node_id: False})

        results = {payload["methodologyId"]: payload for payload in events["result"]}
        assert results["berkus"]["status"] == "skipped"
        assert results["risk_analysis"]["status"] == "completed"
        assert events["thesis"]

    async def test_an_approval_note_reaches_later_agents(self, harness):
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=build_workflow(methodology_ids=["berkus", "risk_analysis"], approvals=["understand"]),
        )
        await drain(orchestrator, {})
        assert any(key.startswith("approval_note::") for key in orchestrator.bundle.gapAnswers)

    async def test_resolving_an_unknown_gate_is_rejected(self, harness):
        orchestrator = Orchestrator(bundle=make_bundle(), workflow=build_workflow(methodology_ids=["berkus"]))
        assert orchestrator.resolve_approval("understand", True) is False

    async def test_a_workflow_without_approvals_never_pauses(self, harness):
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=build_workflow(methodology_ids=["berkus", "risk_analysis"]),
        )
        events = await drain(orchestrator, {})
        assert "approval_required" not in events


class TestExecutionLog:
    async def test_records_a_timestamped_timeline(self, harness):
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=build_workflow(methodology_ids=["berkus", "risk_analysis"]),
        )
        events = await drain(orchestrator, {})

        kinds = [entry["kind"] for entry in events["log"]]
        assert "run_started" in kinds
        assert "agent_started" in kinds
        assert "agent_completed" in kinds
        assert "run_completed" in kinds
        assert all(entry["at"] for entry in events["log"])

        # The finished run carries the whole log so a reload can replay it.
        assert len(events["done"][0]["log"]) == len(events["log"])

    async def test_emits_the_workflow_it_is_executing(self, harness):
        workflow = build_workflow(methodology_ids=["berkus", "risk_analysis"], strategy="scoped")
        orchestrator = Orchestrator(bundle=make_bundle(), workflow=workflow)
        events = await drain(orchestrator, {})

        run = events["run"][0]
        assert run["runId"] == orchestrator.run_id
        assert run["workflow"]["strategy"] == "scoped"
        assert len([node for node in run["workflow"]["nodes"] if node["kind"] == "methodology"]) == 2

    async def test_a_command_scoped_workflow_skips_the_planner(self, harness):
        orchestrator = Orchestrator(
            bundle=make_bundle(),
            workflow=fallback_plan("Research the competitors of this company").to_workflow(),
        )
        events = await drain(orchestrator, {})

        # The planner agent is not consulted when the command already scoped it.
        assert "select" not in harness.calls
        assert set(events["plan"][0]["entries"][0].keys()) >= {"methodologyId", "selected", "reason"}
        ran = {payload["methodologyId"] for payload in events["result"]}
        assert ran == {"competitive_analysis", "market_analysis", "risk_analysis"}
