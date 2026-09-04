from __future__ import annotations

import json

from app import registry
from app.graph import build_graph, methodology_node_id
from app.jsonspec import describe
from app.selection import (
    MANDATORY_METHODOLOGY_IDS, build_manual_plan, build_plan, gate_methodologies,
)
from tests.conftest import make_profile


class TestRegistryIntegrity:
    def test_ids_are_unique(self):
        ids = [spec.id for spec in registry.REGISTRY]
        assert len(set(ids)) == len(ids)

    def test_dependencies_exist(self):
        for spec in registry.REGISTRY:
            for dependency in spec.depends_on:
                assert registry.get(dependency) is not None, f"{spec.id} depends on {dependency}"

    def test_every_methodology_is_usable(self):
        for spec in registry.REGISTRY:
            assert len(spec.instruction) > 40, spec.id
            assert spec.limitations, spec.id
            assert spec.applicable_stages, spec.id
            assert 0 < spec.base_confidence <= 1, spec.id

            rendered = describe(spec.output_schema)
            for required in ("confidence", "evidence", "missingInputs"):
                assert required in rendered, f"{spec.id} is missing {required}"

    def test_valuation_methodologies_compute_deterministically(self):
        for spec in registry.REGISTRY:
            if spec.family == "valuation":
                assert spec.compute is not None, f"{spec.id} must not let the model invent the number"

    def test_summaries_do_not_leak_schemas_to_the_planner(self):
        summaries = registry.summaries()
        assert len(summaries) == len(registry.REGISTRY)
        assert "output_schema" not in json.dumps(summaries)
        assert "outputSchema" not in json.dumps(summaries)


class TestExecutionWaves:
    def test_groups_independent_methodologies_of_equal_priority(self):
        waves = registry.plan_execution_waves(
            ["market_analysis", "competitive_analysis", "berkus", "risk_analysis"]
        )
        assert len(waves) > 1
        assert sorted(item for wave in waves for item in wave) == sorted(
            ["berkus", "competitive_analysis", "market_analysis", "risk_analysis"]
        )

    def test_orders_by_priority(self):
        waves = registry.plan_execution_waves(["risk_analysis", "market_analysis"])
        assert waves[0] == ["market_analysis"]
        assert waves[1] == ["risk_analysis"]

    def test_ignores_unknown_ids(self):
        assert [item for wave in registry.plan_execution_waves(["not_real", "berkus"]) for item in wave] == ["berkus"]

    def test_terminates_on_empty(self):
        assert registry.plan_execution_waves([]) == []


class TestGating:
    def test_berkus_ruled_out_at_growth(self, bundle):
        gate = gate_methodologies(make_profile(stage="growth"), bundle)
        assert "berkus" not in gate.candidates
        assert any(item["methodologyId"] == "berkus" for item in gate.excluded)

    def test_projection_methods_ruled_out_at_idea_stage(self, bundle):
        gate = gate_methodologies(make_profile(stage="idea"), bundle)
        assert "vc_method" not in gate.candidates
        assert "first_chicago" not in gate.candidates
        assert "berkus" in gate.candidates

    def test_readiness_fits_deep_tech_better_than_saas(self, bundle):
        deep_tech = gate_methodologies(make_profile(industries=["deeptech"]), bundle)
        saas = gate_methodologies(make_profile(industries=["saas"]), bundle)
        assert deep_tech.verdicts["readiness_levels"].fit > saas.verdicts["readiness_levels"].fit
        assert "deep-tech" in deep_tech.verdicts["readiness_levels"].reason.lower()

    def test_mandatory_methodologies_always_survive(self, bundle):
        gate = gate_methodologies(make_profile(stage="growth"), bundle)
        for methodology_id in MANDATORY_METHODOLOGY_IDS:
            assert methodology_id in gate.candidates

    def test_never_leaves_the_analysis_without_a_valuation_method(self, bundle):
        gate = gate_methodologies(make_profile(stage="idea"), bundle)
        valuation_candidates = [
            mid for mid in gate.candidates
            if registry.get(mid) and registry.require(mid).family == "valuation"
        ]
        assert valuation_candidates


class TestPlanConstruction:
    def test_falls_back_to_gate_verdicts_without_a_planner(self, profile, bundle):
        plan = build_plan(gate_methodologies(profile, bundle), None)
        assert len(plan.selected_ids()) >= 3
        assert all(entry.reason for entry in plan.entries)

    def test_records_a_reason_for_every_methodology(self, profile, bundle):
        plan = build_plan(gate_methodologies(profile, bundle), None)
        assert len(plan.entries) == len(registry.REGISTRY)
        assert all(entry.reason for entry in plan.entries if not entry.selected)

    def test_planner_may_deselect_an_applicable_methodology(self, profile, bundle):
        plan = build_plan(gate_methodologies(profile, bundle), {
            "strategy": "Focus on market and risk.",
            "selections": [{"methodologyId": "berkus", "selected": False,
                            "reason": "Company has revenue; Berkus adds nothing."}],
        })
        berkus = next(entry for entry in plan.entries if entry.methodologyId == "berkus")
        assert berkus.selected is False
        assert "adds nothing" in berkus.reason

    def test_planner_cannot_re_enable_a_gated_methodology(self, bundle):
        gate = gate_methodologies(make_profile(stage="growth"), bundle)
        plan = build_plan(gate, {
            "selections": [{"methodologyId": "berkus", "selected": True, "reason": "I want to run it anyway."}],
        })
        berkus = next(entry for entry in plan.entries if entry.methodologyId == "berkus")
        assert berkus.selected is False
        assert berkus.gatedOut

    def test_planner_cannot_drop_a_mandatory_methodology(self, profile, bundle):
        plan = build_plan(gate_methodologies(profile, bundle), {
            "selections": [{"methodologyId": mid, "selected": False, "reason": "skip"}
                           for mid in MANDATORY_METHODOLOGY_IDS],
        })
        for methodology_id in MANDATORY_METHODOLOGY_IDS:
            assert next(entry for entry in plan.entries if entry.methodologyId == methodology_id).selected

    def test_tops_up_to_a_minimum(self, profile, bundle):
        plan = build_plan(gate_methodologies(profile, bundle), {
            "selections": [{"methodologyId": spec.id, "selected": spec.id == "berkus",
                            "reason": "planner was too restrictive"} for spec in registry.REGISTRY],
        })
        assert len(plan.selected_ids()) >= 3
        assert any("minimum of" in entry.reason for entry in plan.entries)

    def test_manual_mode_runs_exactly_what_was_asked(self, profile, bundle):
        plan = build_manual_plan(gate_methodologies(profile, bundle), ["berkus"])
        assert plan.selected_ids() == ["berkus"]
        assert "user" in plan.notes.lower()

    def test_guided_mode_keeps_the_mandatory_methodologies(self, profile, bundle):
        plan = build_manual_plan(gate_methodologies(profile, bundle), ["berkus"], enforce_mandatory=True)
        assert "berkus" in plan.selected_ids()
        for methodology_id in MANDATORY_METHODOLOGY_IDS:
            assert methodology_id in plan.selected_ids()

    def test_ignores_an_unknown_methodology_id(self, profile, bundle):
        plan = build_plan(gate_methodologies(profile, bundle), {
            "selections": [{"methodologyId": "made_up", "selected": True, "reason": "hallucinated"}],
        })
        assert "made_up" not in [entry.methodologyId for entry in plan.entries]


class TestGraph:
    def test_draws_the_whole_instrument_set_before_planning(self):
        graph = build_graph()
        methodology_nodes = [node for node in graph.nodes if node.kind == "methodology"]
        assert len(methodology_nodes) == len(registry.REGISTRY)
        assert all(node.status == "idle" for node in methodology_nodes)

    def test_has_the_pipeline_spine(self):
        graph = build_graph()
        ids = {node.id for node in graph.nodes}
        assert {"input", "understand", "select", "critic", "reconcile", "synthesis", "report"} <= ids

    def test_every_methodology_is_wired_between_planner_and_critic(self):
        graph = build_graph()
        for spec in registry.REGISTRY:
            node_id = methodology_node_id(spec.id)
            assert any(edge.source == "select" and edge.target == node_id for edge in graph.edges)
            assert any(edge.source == node_id and edge.target == "critic" for edge in graph.edges)

    def test_has_a_feedback_edge_for_the_revise_loop(self):
        graph = build_graph()
        assert any(edge.kind == "feedback" for edge in graph.edges)

    def test_layers_are_monotonic_along_flow_edges(self):
        graph = build_graph()
        index = {node.id: node for node in graph.nodes}
        for edge in graph.edges:
            if edge.kind != "flow":
                continue
            assert index[edge.source].layer < index[edge.target].layer, f"{edge.source} -> {edge.target}"
