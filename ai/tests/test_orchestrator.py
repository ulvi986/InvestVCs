"""Orchestration tests.

The model gateway is the only thing the orchestrator talks to, so replacing it
exercises the whole graph — planning, parallel waves, failure isolation, the
critic loop, reconciliation and synthesis — with no network.
"""

from __future__ import annotations

from typing import Any, Optional

import pytest

from app import registry
from app.graph import methodology_node_id
from app.llm import AgentError, AgentResponse, llm
from app.mock import mock_output
from app.orchestrator import Orchestrator
from app.schemas import InputBundle


class Harness:
    """Stands in for the model. Records every call and can be told to fail."""

    def __init__(
        self,
        *,
        select: Optional[list[str]] = None,
        fail_methodologies: Optional[list[str]] = None,
        fail_roles: Optional[list[str]] = None,
        critic_verdict: str = "pass",
        rerun_requests: Optional[list[dict[str, str]]] = None,
    ) -> None:
        self.select = select
        self.fail_methodologies = fail_methodologies or []
        self.fail_roles = fail_roles or []
        self.critic_verdict = critic_verdict
        self.rerun_requests = rerun_requests or []
        self.calls: list[dict[str, Any]] = []
        self._critic_calls = 0

    async def run(self, *, role: str, instruction: str, schema: Any, context: Any, label: str = "", temperature=None):
        methodology_id = ((context or {}).get("methodology") or {}).get("id")
        self.calls.append({"role": role, "methodologyId": methodology_id, "instruction": instruction})

        if role in self.fail_roles:
            raise AgentError(f"{role} unavailable")
        if role == "methodology" and methodology_id in self.fail_methodologies:
            raise AgentError(f"{methodology_id} exploded")

        output = mock_output(role, context)

        if role == "select" and self.select is not None:
            output["selections"] = [
                {
                    "methodologyId": spec.id,
                    "selected": spec.id in self.select,
                    "reason": f"Chosen for this company: {spec.name}.",
                    "expectedConfidence": 0.7,
                }
                for spec in registry.REGISTRY
            ]

        if role == "critic":
            self._critic_calls += 1
            revising = self.critic_verdict == "revise" and self._critic_calls == 1
            output["verdict"] = "revise" if revising else "pass"
            output["rerunRequests"] = self.rerun_requests if revising else []

        return AgentResponse(output=output, duration_ms=5, model="harness")

    def methodology_calls(self) -> list[str]:
        return [call["methodologyId"] for call in self.calls if call["role"] == "methodology"]


@pytest.fixture
def harness(monkeypatch):
    def install(**kwargs: Any) -> Harness:
        instance = Harness(**kwargs)
        monkeypatch.setattr(llm, "run", instance.run)
        return instance

    return install


async def collect(orchestrator: Orchestrator) -> dict[str, list[Any]]:
    events: dict[str, list[Any]] = {}
    async for event in orchestrator.stream():
        events.setdefault(event["type"], []).append(event["payload"])
    return events


def make_orchestrator(**kwargs: Any) -> Orchestrator:
    bundle = InputBundle(
        startupName="Test Co",
        narrative="A SaaS company selling workflow tooling to SMBs in the EU.",
    )
    return Orchestrator(bundle=bundle, concurrency=4, **kwargs)


DEFAULT_SELECTION = ["market_analysis", "berkus", "scorecard", "risk_analysis", "vc_method"]


class TestPipeline:
    async def test_runs_the_full_graph_and_produces_a_thesis(self, harness):
        instance = harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())

        roles = [call["role"] for call in instance.calls]
        assert roles[0] == "understand"
        assert roles[1] == "select"
        assert "methodology" in roles
        assert "critic" in roles
        assert roles[-1] == "synthesis"

        assert "error" not in events
        assert events["thesis"][0]["recommendation"] == "consider"
        assert events["done"][0]["hasThesis"] is True

    async def test_runs_only_the_selected_methodologies(self, harness):
        instance = harness(select=DEFAULT_SELECTION)
        await collect(make_orchestrator())
        assert sorted(instance.methodology_calls()) == sorted(DEFAULT_SELECTION)
        assert "first_chicago" not in instance.methodology_calls()

    async def test_computes_valuations_deterministically(self, harness):
        harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())
        results = {payload["methodologyId"]: payload for payload in events["result"]}

        # Berkus: all five components at 3 -> 5 x $250k.
        assert results["berkus"]["valuation"]["point"] == 1_250_000
        # Scorecard: mock factors (1.09 weighted multiple) against a $3M median.
        assert results["scorecard"]["valuation"]["point"] == 3_270_000

    async def test_emits_a_graph_and_node_updates_for_every_stage(self, harness):
        harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())

        graph = events["graph"][0]
        assert {node["id"] for node in graph["nodes"]} >= {"input", "understand", "select", "critic", "reconcile", "synthesis", "report"}

        touched = {node["id"] for node in events["node"]}
        assert "understand" in touched
        assert methodology_node_id("berkus") in touched
        assert "report" in touched

        # Unselected methodologies are marked skipped, not removed.
        skipped = [node for node in events["node"] if node["status"] == "skipped"]
        assert any(node["id"] == methodology_node_id("first_chicago") for node in skipped)

    async def test_node_headlines_carry_the_result(self, harness):
        harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())
        berkus_updates = [node for node in events["node"] if node["id"] == methodology_node_id("berkus")]
        completed = [node for node in berkus_updates if node["status"] == "completed"]
        assert completed and "$" in completed[-1]["headline"]

    async def test_explains_every_methodology_choice(self, harness):
        harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())
        explanation = events["thesis"][0]["methodologySelectionExplanation"]
        assert len(explanation) == len(registry.REGISTRY)
        assert all(entry["reason"] for entry in explanation)

    async def test_caps_confidence_at_the_critic_ceiling(self, harness):
        harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())
        assert events["thesis"][0]["confidence"]["overall"] <= 0.5

    async def test_reconciles_rather_than_averages(self, harness):
        harness(select=DEFAULT_SELECTION)
        events = await collect(make_orchestrator())
        reconciled = events["reconciled"][0]
        assert reconciled["range"]["point"] > 0
        assert reconciled["weights"]
        assert "averag" in reconciled["explanation"].lower()


class TestFailureHandling:
    async def test_one_methodology_failing_does_not_stop_the_analysis(self, harness):
        harness(select=DEFAULT_SELECTION, fail_methodologies=["scorecard"])
        events = await collect(make_orchestrator())

        results = {payload["methodologyId"]: payload for payload in events["result"]}
        assert results["scorecard"]["status"] == "failed"
        assert "exploded" in results["scorecard"]["error"]
        assert results["berkus"]["status"] == "completed"

        thesis = events["thesis"][0]
        assert "scorecard" in [item["methodologyId"] for item in thesis["incompleteAnalysis"]]
        assert any("Scorecard Method failed" in item for item in events["done"][0]["degradations"])

    async def test_planner_failure_falls_back_to_platform_gates(self, harness):
        harness(fail_roles=["select"])
        events = await collect(make_orchestrator())
        assert any(entry["selected"] for entry in events["plan"][0]["entries"])
        assert any("planning fell back" in item for item in events["done"][0]["degradations"])
        assert events["thesis"]

    async def test_critic_failure_caps_confidence(self, harness):
        harness(select=DEFAULT_SELECTION, fail_roles=["critic"])
        events = await collect(make_orchestrator())
        assert "critique" not in events
        assert any("Cross-validation did not run" in item for item in events["done"][0]["degradations"])
        assert events["thesis"][0]["confidence"]["overall"] <= 0.5

    async def test_synthesis_failure_keeps_the_methodology_results(self, harness):
        harness(select=DEFAULT_SELECTION, fail_roles=["synthesis"])
        events = await collect(make_orchestrator())
        assert "thesis" not in events
        assert events["result"]
        assert events["done"][0]["hasThesis"] is False
        assert any("synthesis failed" in item.lower() for item in events["done"][0]["degradations"])

    async def test_understanding_failure_aborts(self, harness):
        harness(fail_roles=["understand"])
        events = await collect(make_orchestrator())
        assert "startup profile" in events["error"][0]["message"].lower()

    async def test_every_methodology_failing_aborts(self, harness):
        harness(fail_methodologies=[spec.id for spec in registry.REGISTRY])
        events = await collect(make_orchestrator())
        assert "Every methodology failed" in events["error"][0]["message"]


class TestCriticLoop:
    async def test_reruns_only_what_the_critic_asked_for(self, harness):
        instance = harness(
            select=DEFAULT_SELECTION,
            critic_verdict="revise",
            rerun_requests=[{"methodologyId": "scorecard", "instruction": "Re-derive the comparables median from EU seed data."}],
        )
        events = await collect(make_orchestrator(max_iterations=2))

        calls = instance.methodology_calls()
        assert calls.count("scorecard") == 2
        assert calls.count("berkus") == 1
        assert events["done"][0]["iterations"] == 2

    async def test_passes_the_critic_instruction_into_the_rerun(self, harness):
        instance = harness(
            select=DEFAULT_SELECTION,
            critic_verdict="revise",
            rerun_requests=[{"methodologyId": "scorecard", "instruction": "Re-derive the comparables median from EU seed data."}],
        )
        await collect(make_orchestrator(max_iterations=2))
        rerun = next(
            call for call in instance.calls
            if call["methodologyId"] == "scorecard" and "RE-RUN" in call["instruction"]
        )
        assert "EU seed data" in rerun["instruction"]

    async def test_does_not_loop_past_max_iterations(self, harness):
        harness(
            select=DEFAULT_SELECTION,
            critic_verdict="revise",
            rerun_requests=[{"methodologyId": "scorecard", "instruction": "again"}],
        )
        events = await collect(make_orchestrator(max_iterations=1))
        assert events["done"][0]["iterations"] == 1

    async def test_stops_when_revise_names_nothing(self, harness):
        harness(select=DEFAULT_SELECTION, critic_verdict="revise", rerun_requests=[])
        events = await collect(make_orchestrator(max_iterations=3))
        assert events["done"][0]["iterations"] == 1
        assert events["thesis"]


class TestModes:
    async def test_manual_mode_skips_the_planner(self, harness):
        instance = harness()
        events = await collect(make_orchestrator(mode="manual", chosen_methodology_ids=["berkus"]))

        assert not [call for call in instance.calls if call["role"] == "select"]
        assert instance.methodology_calls() == ["berkus"]
        assert "user" in events["plan"][0]["notes"].lower()

    async def test_guided_mode_keeps_risk_analysis(self, harness):
        instance = harness()
        await collect(make_orchestrator(mode="guided", chosen_methodology_ids=["berkus"]))
        calls = instance.methodology_calls()
        assert "berkus" in calls
        assert "risk_analysis" in calls


class TestUserChallenge:
    async def test_challenge_is_forced_into_the_critic_instruction(self, harness):
        from app.orchestrator import USER_CHALLENGE_KEY

        instance = harness(select=DEFAULT_SELECTION)
        bundle = InputBundle(
            startupName="Test Co",
            narrative="A SaaS company selling workflow tooling to SMBs in the EU.",
            gapAnswers={USER_CHALLENGE_KEY: "The market sizing is too conservative."},
        )
        await collect(Orchestrator(bundle=bundle, concurrency=4))

        critic_call = next(call for call in instance.calls if call["role"] == "critic")
        assert "too conservative" in critic_call["instruction"]
        assert "do not defer to the user" in critic_call["instruction"].lower()
