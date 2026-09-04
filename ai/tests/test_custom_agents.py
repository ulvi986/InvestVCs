"""User-defined agents.

The point of these tests is that a custom agent is not a decoration on the
graph: it is gated, planned, executed and returned like any other methodology.
If that ever stops being true, the UI would be drawing an agent that does no
work, which is the one thing the product must not do.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from app import custom, registry
from app.llm import AgentResponse, llm
from app.mock import mock_output
from app.orchestrator import Orchestrator
from app.schemas import InputBundle
from app.workflow import build_workflow, methodology_node_id

BUNDLE = InputBundle(
    startupName="Northwind Labs",
    narrative=(
        "Workflow automation for mid-market logistics operators. Seed stage, 14 paying "
        "customers, 42k MRR growing 11% month on month, 9 staff, raising 3.5m at 14m pre."
    ),
)


def a_spec(name: str = "Regulatory Exposure"):
    return custom.build_spec(
        name=name,
        purpose="Whether this company needs a licence it does not have.",
        instruction="Identify every licence or approval this business model requires, and whether the company holds it.",
        family="risk",
    )


# ── The spec itself ──────────────────────────────────────────────────────


def test_a_custom_agent_gets_a_namespaced_id():
    spec = a_spec()
    assert spec.id == "custom_regulatory_exposure"
    assert custom.is_custom(spec.id)


def test_ids_are_safe_for_odd_names():
    # Accented and punctuation characters are dropped rather than transliterated,
    # which is fine: the id only has to be stable and registry-safe.
    assert custom.slug("  Ünité // 42  ") == "custom_nit_42"
    assert custom.slug("Runway & Burn") == "custom_runway_burn"
    assert custom.slug("") == "custom_agent"


def test_confidence_is_capped_below_the_built_ins():
    spec = a_spec()
    # Nothing deterministic corroborates it, so it cannot claim as much as a
    # methodology with reviewable arithmetic behind it.
    assert spec.base_confidence <= custom.MAX_BASE_CONFIDENCE
    assert any("no deterministic" in limitation for limitation in spec.limitations)


def test_an_unknown_family_falls_back_rather_than_breaking_the_critic():
    spec = custom.build_spec(name="X", purpose="", instruction="do it", family="astrology")
    assert spec.family in custom.FAMILIES


# ── Registry overlay ─────────────────────────────────────────────────────


def test_the_overlay_is_scoped_to_the_run():
    spec = a_spec()
    assert registry.get(spec.id) is None

    with custom.overlay([spec]):
        assert registry.get(spec.id) is spec
        assert spec in registry.active()
        assert len(registry.active()) == len(registry.REGISTRY) + 1

    assert registry.get(spec.id) is None
    assert registry.active() == registry.REGISTRY


def test_the_overlay_does_not_shadow_a_built_in():
    with custom.overlay([a_spec()]):
        assert registry.get("berkus") is not None
        assert registry.require("berkus").family == "valuation"


def test_execution_waves_include_custom_agents():
    spec = a_spec()
    with custom.overlay([spec]):
        waves = registry.plan_execution_waves(["market_analysis", spec.id, "berkus"])
    assert spec.id in [mid for wave in waves for mid in wave]


# ── End to end ───────────────────────────────────────────────────────────


def test_a_custom_agent_runs_and_returns_a_result(monkeypatch):
    """The whole point: it produces a real methodology result."""
    spec = a_spec()

    async def fake_run(*, role: str, instruction: str, schema: Any, context: Any,
                       label: str = "", temperature=None):
        return AgentResponse(output=mock_output(role, context), duration_ms=5, model="harness")

    monkeypatch.setattr(llm, "run", fake_run)

    async def run():
        # The specs are handed to the orchestrator, not left in the caller's
        # context: the run executes in a task the HTTP layer does not own, and
        # a ContextVar set around a streaming response does not reach it.
        with custom.overlay([spec]):
            workflow = build_workflow(methodology_ids=["market_analysis", spec.id])

        orchestrator = Orchestrator(bundle=BUNDLE, mode="guided",
                                    chosen_methodology_ids=["market_analysis", spec.id],
                                    workflow=workflow, concurrency=4, custom_specs=[spec])
        results, nodes = {}, {}
        if True:
            async for event in orchestrator.stream():
                if event["type"] == "result":
                    results[event["payload"]["methodologyId"]] = event["payload"]
                if event["type"] == "node":
                    nodes[event["payload"]["id"]] = event["payload"]
            return results, nodes

    results, nodes = asyncio.run(run())

    assert spec.id in results, "the custom agent produced no result"
    assert results[spec.id]["status"] == "completed"

    # And it is drawn as a node that actually reached a settled state.
    node = nodes.get(methodology_node_id(spec.id))
    assert node is not None
    assert node["status"] == "completed"
    assert node["label"] == spec.name


def test_the_orchestrator_does_not_depend_on_the_caller_context(monkeypatch):
    """Regression: custom agents were dropped over HTTP because the overlay was
    set around the streaming response rather than carried by the run."""
    spec = a_spec("Ambient Check")

    async def fake_run(*, role: str, instruction: str, schema: Any, context: Any,
                       label: str = "", temperature=None):
        return AgentResponse(output=mock_output(role, context), duration_ms=5, model="harness")

    monkeypatch.setattr(llm, "run", fake_run)

    async def run():
        # No overlay active here at all.
        orchestrator = Orchestrator(bundle=BUNDLE, mode="guided",
                                    chosen_methodology_ids=[spec.id],
                                    concurrency=4, custom_specs=[spec])
        seen = []
        async for event in orchestrator.stream():
            if event["type"] == "result":
                seen.append(event["payload"]["methodologyId"])
        return seen

    assert spec.id in asyncio.run(run())
