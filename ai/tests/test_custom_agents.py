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

from app import commands, custom, registry
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


# ── Reaching a custom agent from an instruction ──────────────────────────
#
# Creating an agent is only half of it. Until an instruction can name one, a
# custom agent runs only when the orchestrator happens to pick it, which is not
# what "add your own agent to the workflow" means to the person who added it.


def test_the_keyword_router_finds_an_agent_by_the_name_it_was_given():
    """The static hint table only knows the built-ins, so a custom agent has to
    be matched by its own name or the keyword path can never reach it."""
    spec = a_spec("Regulatory Exposure")

    with custom.overlay([spec]):
        plan = commands.fallback_plan("run the Regulatory Exposure agent on this company")

    assert spec.id in plan.methodology_ids


def test_matching_is_case_insensitive():
    spec = a_spec("Supply Chain Fragility")
    with custom.overlay([spec]):
        plan = commands.fallback_plan("check supply chain fragility please")
    assert spec.id in plan.methodology_ids


def test_an_agent_that_was_not_named_is_not_pulled_in():
    spec = a_spec("Regulatory Exposure")
    with custom.overlay([spec]):
        plan = commands.fallback_plan("what is this company worth")
    assert spec.id not in plan.methodology_ids


def test_naming_only_your_own_agent_runs_only_that_agent():
    """A named built-in valuation method is paired with the risk screen to keep
    it honest. A custom agent asked for by name should not drag that in: the
    user asked for one thing."""
    spec = a_spec("Regulatory Exposure")
    with custom.overlay([spec]):
        plan = commands.fallback_plan("run Regulatory Exposure")
    assert plan.methodology_ids == [spec.id]


def test_naming_a_built_in_still_pairs_with_the_risk_screen():
    """The behaviour that existed before custom agents were matched here."""
    plan = commands.fallback_plan("value it with berkus")
    assert "berkus" in plan.methodology_ids
    assert "risk_analysis" in plan.methodology_ids


def test_a_named_custom_agent_becomes_a_node_in_the_compiled_workflow():
    """The plan is only useful if the workflow built from it actually contains
    the agent: this is the step that was missing end to end."""
    spec = a_spec("Regulatory Exposure")

    with custom.overlay([spec]):
        plan = commands.fallback_plan("run the Regulatory Exposure agent")
        workflow = build_workflow(methodology_ids=plan.methodology_ids, origin="user")

    node_ids = {node.id for node in workflow.nodes}
    assert methodology_node_id(spec.id) in node_ids

    node = next(n for n in workflow.nodes if n.id == methodology_node_id(spec.id))
    assert node.label == spec.name
    assert node.agent == spec.id


def test_the_compiler_is_told_which_custom_agents_exist():
    """The model cannot return an id it was never shown, so the instruction
    context has to carry the team's agents alongside the built-ins."""
    spec = a_spec("Regulatory Exposure")

    with custom.overlay([spec]):
        offered = {s.id for s in registry.active()}

    assert spec.id in offered
    assert "berkus" in offered, "the built-ins must still be offered"


def test_custom_agents_are_invisible_once_the_overlay_is_gone():
    """One team's agents must not leak into another team's compilation."""
    spec = a_spec("Regulatory Exposure")
    with custom.overlay([spec]):
        pass
    assert spec.id not in {s.id for s in registry.active()}
    assert commands.fallback_plan("run Regulatory Exposure").methodology_ids != [spec.id]
