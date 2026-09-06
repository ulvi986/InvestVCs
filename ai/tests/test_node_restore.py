"""The graph must not contradict the report.

Seen in a live run: VC Method produced $12,556,972, the critic asked for a
revision, the revision came back with nothing, and the guard correctly kept the
$12.5M for the report - but the node had already been drawn as failed and
nothing put it back. The user is then looking at a red agent beside its own
valid answer, which is exactly the "this agent did not work" complaint.
"""

from __future__ import annotations

from typing import Any

import pytest

from app import registry
from app.llm import AgentResponse, llm
from app.mock import mock_output
from app.orchestrator import Orchestrator
from app.schemas import InputBundle

BUNDLE = InputBundle(
    startupName="Northwind Labs",
    narrative=(
        "Cross-border payments for logistics SMEs. Seed stage, 14 paying customers, "
        "42k MRR growing 11% month on month, 9 staff, raising 3.5m at 14m pre."
    ),
)

TARGET = "scorecard"


class RevisesIntoNothing:
    """Produces a good first pass, then a worthless revision - the live shape."""

    def __init__(self, target: str = TARGET):
        self.target = target
        self.seen: dict[str, int] = {}

    async def run(self, *, role: str, instruction: str, schema: Any, context: Any,
                  label: str = "", temperature: Any = None) -> AgentResponse:
        output = mock_output(role, context)

        if role == "select":
            output["selections"] = [
                {
                    "methodologyId": spec.id,
                    "selected": spec.id in (TARGET, "risk_analysis"),
                    "reason": "Chosen.",
                    "expectedConfidence": 0.7,
                }
                for spec in registry.REGISTRY
            ]

        if role == "critic":
            attempt = self.seen.get("critic", 0)
            self.seen["critic"] = attempt + 1
            output["verdict"] = "revise" if attempt == 0 else "pass"
            output["rerunRequests"] = (
                [{"methodologyId": self.target, "instruction": "Justify the anchor."}]
                if attempt == 0 else []
            )

        if role == "methodology":
            methodology_id = (context or {}).get("methodology", {}).get("id")
            attempt = self.seen.get(methodology_id, 0)
            self.seen[methodology_id] = attempt + 1
            if methodology_id == self.target and attempt > 0:
                # The revision: no inputs at all, so no valuation comes out and
                # the methodology reports insufficient input.
                output["inputs"] = {}
                output["confidence"] = 0.0

        return AgentResponse(output=output, duration_ms=5, model="harness")


async def run_once(monkeypatch) -> dict[str, Any]:
    stub = RevisesIntoNothing()
    monkeypatch.setattr(llm, "run", stub.run)

    orchestrator = Orchestrator(bundle=BUNDLE, mode="autonomous", concurrency=4)
    nodes: dict[str, list[dict]] = {}
    results: dict[str, list[dict]] = {}
    async for event in orchestrator.stream():
        if event["type"] == "node":
            nodes.setdefault(event["payload"]["id"], []).append(event["payload"])
        if event["type"] == "result":
            results.setdefault(event["payload"]["methodologyId"], []).append(event["payload"])
    return {"nodes": nodes, "results": results, "stub": stub}


async def test_the_revision_actually_happened(monkeypatch):
    """Guard the fixture: if the critic never triggered a re-run, the rest of
    this file proves nothing."""
    run = await run_once(monkeypatch)
    assert run["stub"].seen.get(TARGET, 0) >= 2


async def test_the_node_ends_on_the_result_that_was_kept(monkeypatch):
    run = await run_once(monkeypatch)
    updates = run["nodes"]["methodology:scorecard"]

    assert updates[-1]["status"] == "completed", (
        "the graph still shows the rejected revision"
    )


async def test_the_node_carries_the_kept_figure_not_an_empty_one(monkeypatch):
    run = await run_once(monkeypatch)
    final = run["nodes"]["methodology:scorecard"][-1]

    assert final["headline"], "the node lost its valuation"
    assert final["confidence"] and final["confidence"] > 0
    assert final["error"] is None


async def test_a_run_with_no_rejected_revision_is_unaffected(monkeypatch):
    """The restore must not fire when the revision was accepted."""

    class RevisesWell(RevisesIntoNothing):
        async def run(self, *, role, instruction, schema, context, label="", temperature=None):
            output = mock_output(role, context)
            if role == "select":
                output["selections"] = [
                    {"methodologyId": spec.id, "selected": spec.id in (TARGET, "risk_analysis"),
                     "reason": "Chosen.", "expectedConfidence": 0.7}
                    for spec in registry.REGISTRY
                ]
            if role == "critic":
                attempt = self.seen.get("critic", 0)
                self.seen["critic"] = attempt + 1
                output["verdict"] = "revise" if attempt == 0 else "pass"
                output["rerunRequests"] = (
                    [{"methodologyId": self.target, "instruction": "Justify."}] if attempt == 0 else []
                )
            return AgentResponse(output=output, duration_ms=5, model="harness")

    stub = RevisesWell()
    monkeypatch.setattr(llm, "run", stub.run)
    orchestrator = Orchestrator(bundle=BUNDLE, mode="autonomous", concurrency=4)

    statuses = []
    async for event in orchestrator.stream():
        if event["type"] == "node" and event["payload"]["id"] == "methodology:scorecard":
            statuses.append(event["payload"]["status"])

    assert statuses[-1] == "completed"
