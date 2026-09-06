"""What the founder asked for is not the planner's to discard.

Reported: VC Method and other methodologies did not run, and a team's own agent
did not run either. Reproduced against the live service - the platform gates
said VC Method applied, the founder had supplied its revenue and exit multiple,
and the planning agent still chose to skip it. Nothing was broken in the sense
of throwing; the methodology was simply absent from a report the user had
entered numbers for, which is indistinguishable from broken.

The gates still decide what is applicable. Only the planner's preference is
overridden, and its reasoning is carried into the plan either way.
"""

from __future__ import annotations

from app import custom
from app.schemas import InputBundle, ManualAnswers
from app.selection import build_plan, founder_requested, gate_methodologies
from tests.conftest import make_profile


def bundle(**manual) -> InputBundle:
    return InputBundle(
        startupName="Northwind Labs",
        narrative="Seed-stage payments company with revenue.",
        manual=ManualAnswers(**manual),
    )


def a_custom_spec(name: str = "Regulatory Exposure"):
    return custom.build_spec(
        name=name,
        purpose="Whether this company needs a licence it does not have.",
        instruction="Identify every licence this business model requires.",
        family="risk",
    )


#: A planner that wants to skip everything it is allowed to skip.
def planner_skipping(*ids):
    return {
        "selections": [
            {"methodologyId": mid, "selected": False, "reason": "The planner judged this thin."}
            for mid in ids
        ]
    }


# ── Reading the request out of the bundle ────────────────────────────────


def test_vc_inputs_are_a_request_to_run_vc_method():
    assert "vc_method" in founder_requested(bundle(vcAnswers={"revenue": 540000, "exitMultiple": 6}))


def test_the_berkus_grid_is_a_request_to_run_berkus():
    assert "berkus" in founder_requested(bundle(berkusAnswers=[400000, None, None, None, None]))


def test_a_comparables_median_alone_is_a_request_to_run_scorecard():
    assert "scorecard" in founder_requested(bundle(scorecardMedian=4_200_000))


def test_first_chicago_scenarios_are_a_request():
    assert "first_chicago" in founder_requested(bundle(chicagoAnswers={"best": 4e7, "base": 1.4e7, "worst": 2e6}))


def test_the_risk_grid_is_a_request():
    assert "risk_factor" in founder_requested(bundle(riskAnswers=[1, 0, -1] + [None] * 9))


def test_a_readiness_checklist_is_a_request():
    assert "readiness_levels" in founder_requested(bundle(trlAnswers={"trl1": True}))


def test_a_filled_canvas_is_a_request():
    filled = InputBundle(startupName="X", bmc={"valueProposition": "Cuts empty miles."})
    assert "business_model_canvas" in founder_requested(filled)


def test_a_financial_snapshot_is_a_request():
    filled = InputBundle(startupName="X", financialSnapshot={"monthlyBurnUsd": 40000})
    assert "financial_analysis" in founder_requested(filled)


def test_an_empty_bundle_requests_nothing():
    assert founder_requested(InputBundle(startupName="X")) == set()


def test_unanswered_grids_are_not_a_request():
    """A grid rendered but never filled in is not a request."""
    assert founder_requested(bundle(berkusAnswers=[None] * 5, riskAnswers=[None] * 12)) == set()


def test_a_team_s_own_agent_is_requested_by_definition():
    """Nobody writes an agent in order for it not to run."""
    spec = a_custom_spec()
    with custom.overlay([spec]):
        assert spec.id in founder_requested(InputBundle(startupName="X"))


# ── The planner cannot drop it ───────────────────────────────────────────


def test_the_planner_may_not_skip_a_methodology_whose_inputs_were_supplied():
    profile = make_profile(stage="seed")
    gate = gate_methodologies(profile, bundle(vcAnswers={"revenue": 540000, "exitMultiple": 6}))
    assert "vc_method" in gate.candidates, "the gate itself excluded it; wrong fixture"

    plan = build_plan(gate, planner_skipping("vc_method"))
    entry = next(e for e in plan.entries if e.methodologyId == "vc_method")

    assert entry.selected is True


def test_the_planner_s_objection_is_carried_rather_than_hidden():
    """Running it anyway is not the same as pretending the planner agreed."""
    profile = make_profile(stage="seed")
    gate = gate_methodologies(profile, bundle(vcAnswers={"revenue": 540000}))

    plan = build_plan(gate, planner_skipping("vc_method"))
    entry = next(e for e in plan.entries if e.methodologyId == "vc_method")

    assert "you supplied its inputs" in entry.reason
    assert "planner would have skipped it" in entry.reason


def test_a_team_s_own_agent_survives_a_planner_that_would_skip_it():
    spec = a_custom_spec()
    with custom.overlay([spec]):
        profile = make_profile(stage="seed")
        gate = gate_methodologies(profile, InputBundle(startupName="X"))
        plan = build_plan(gate, planner_skipping(spec.id))
        entry = next(e for e in plan.entries if e.methodologyId == spec.id)

    assert entry.selected is True


def test_a_planner_that_never_mentions_it_still_runs_it():
    """A custom agent's fit sits right on the selection threshold, so silence
    from the planner must not be enough to lose it."""
    spec = a_custom_spec()
    with custom.overlay([spec]):
        gate = gate_methodologies(make_profile(stage="seed"), InputBundle(startupName="X"))
        plan = build_plan(gate, {"selections": []})
        entry = next(e for e in plan.entries if e.methodologyId == spec.id)

    assert entry.selected is True


# ── What the request does not override ───────────────────────────────────


def test_the_gates_still_win_over_a_request():
    """Supplying Berkus inputs for a growth-stage company does not make Berkus
    meaningful. The request overrides the planner, never applicability."""
    profile = make_profile(stage="growth", traction={
        "customers": 400, "revenueUsd": 12_000_000, "growthNote": "", "pilots": "", "notes": "",
    })
    gate = gate_methodologies(profile, bundle(berkusAnswers=[400000] * 5))

    plan = build_plan(gate, None)
    entry = next(e for e in plan.entries if e.methodologyId == "berkus")

    assert entry.selected is False
    assert entry.gatedOut


def test_the_planner_can_still_skip_what_the_founder_did_not_ask_for():
    """The complement, and the proof this is a rule rather than a rubber stamp:
    with nothing supplied for it, the planner's judgement still stands."""
    profile = make_profile(stage="seed")
    gate = gate_methodologies(profile, InputBundle(startupName="X"))
    assert "vc_method" not in gate.requested

    plan = build_plan(gate, planner_skipping("vc_method"))
    entry = next(e for e in plan.entries if e.methodologyId == "vc_method")

    assert entry.selected is False
    assert "you supplied its inputs" not in entry.reason


def test_a_request_does_not_disturb_anything_else_in_the_plan():
    profile = make_profile(stage="seed")
    gate = gate_methodologies(profile, bundle(vcAnswers={"revenue": 540000}))

    plan = build_plan(gate, planner_skipping("vc_method"))
    ids = {entry.methodologyId for entry in plan.entries}

    assert "risk_analysis" in ids
    assert len(plan.entries) >= 10
