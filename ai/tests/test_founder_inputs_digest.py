"""The founder's calculator numbers, as the agent receives them.

Second half of the "VC Method did not run" report. Once the planner stopped
dropping it, the methodology ran and then reported insufficient input on a
company whose founder had filled the form in.

The cause was vocabulary. The calculator's `revenue` field means revenue in the
EXIT year, already projected; the agent's schema calls that
`exitYearRevenueUsd`. Handing over the raw dict gave the agent a number it could
not safely interpret, so it assigned zero, and a valuation methodology that
cannot produce a number is reported as insufficient input.
"""

from __future__ import annotations

from app.orchestrator import _chicago_inputs, _vc_inputs, digest_bundle
from app.schemas import InputBundle, ManualAnswers

# Exactly what the VC Method calculator stores.
VC_ANSWERS = {
    "revenue": 12_000_000,
    "netIncomeMargin": 18,
    "exitMultiple": 6,
    "customMultiple": 0,
    "isOther": False,
    "exitYears": 5,
    "requiredIRR": 35,
    "investmentAmount": 3_500_000,
}

CHICAGO_ANSWERS = {
    "revenue": 14_000_000,
    "exitMultiple": 5,
    "customMultiple": 0,
    "isOther": False,
    "yearsToExit": 5,
    "discountRates": {"worst": 60, "base": 35, "best": 22},
    "probabilities": {"worst": 25, "base": 60, "best": 15},
}


# ── VC Method ────────────────────────────────────────────────────────────


def test_the_calculator_fields_are_renamed_to_the_agent_s_own_schema():
    mapped = _vc_inputs(VC_ANSWERS)

    assert mapped["exitYearRevenueUsd"] == 12_000_000
    assert mapped["exitMultiple"] == 6
    assert mapped["yearsToExit"] == 5
    assert mapped["requiredIrrPct"] == 35
    assert mapped["investmentAmountUsd"] == 3_500_000
    assert mapped["netIncomeMarginPct"] == 18


def test_the_agent_is_told_the_revenue_is_already_projected():
    """The whole failure was the agent not knowing this."""
    note = _vc_inputs(VC_ANSWERS)["note"]
    assert "exit year" in note
    assert "not current" in note


def test_a_custom_multiple_wins_when_the_founder_chose_other():
    mapped = _vc_inputs({**VC_ANSWERS, "isOther": True, "customMultiple": 11})
    assert mapped["exitMultiple"] == 11


def test_the_standard_multiple_is_used_when_other_was_not_chosen():
    assert _vc_inputs({**VC_ANSWERS, "customMultiple": 11})["exitMultiple"] == 6


def test_fields_the_founder_left_empty_are_omitted_rather_than_sent_as_zero():
    """A zero would be adopted as a real figure and produce a zero valuation."""
    mapped = _vc_inputs({**VC_ANSWERS, "investmentAmount": 0, "netIncomeMargin": 0})
    assert "investmentAmountUsd" not in mapped
    assert "netIncomeMarginPct" not in mapped
    assert mapped["exitYearRevenueUsd"] == 12_000_000


def test_an_untouched_calculator_sends_nothing():
    assert _vc_inputs({}) is None
    assert _vc_inputs(None) is None
    assert _vc_inputs({"revenue": 0, "exitMultiple": 0, "exitYears": 0}) is None


def test_rubbish_values_do_not_reach_the_agent():
    assert _vc_inputs({"revenue": "not a number", "exitMultiple": None}) is None


# ── First Chicago ────────────────────────────────────────────────────────


def test_the_chicago_scenarios_are_shaped_the_way_the_agent_expects():
    mapped = _chicago_inputs(CHICAGO_ANSWERS)

    assert mapped["exitYearRevenueUsd"] == 14_000_000
    assert mapped["exitMultiple"] == 5
    assert mapped["scenarios"]["worst"] == {"discountRatePct": 60, "probabilityPct": 25}
    assert mapped["scenarios"]["best"] == {"discountRatePct": 22, "probabilityPct": 15}


def test_a_chicago_calculator_never_opened_sends_nothing():
    assert _chicago_inputs(None) is None
    assert _chicago_inputs({}) is None


# ── What the agent actually sees ─────────────────────────────────────────


def test_the_mapped_inputs_reach_the_digest_every_agent_reads():
    bundle = InputBundle(
        startupName="Northwind Labs",
        manual=ManualAnswers(vcAnswers=VC_ANSWERS, chicagoAnswers=CHICAGO_ANSWERS),
    )
    supplied = digest_bundle(bundle)["founderSuppliedAnswers"]

    assert supplied["vcMethodInputs"]["exitYearRevenueUsd"] == 12_000_000
    assert supplied["firstChicagoInputs"]["exitYearRevenueUsd"] == 14_000_000


def test_the_raw_ambiguous_shape_is_no_longer_sent():
    """`vcInputs` was the opaque dict the agent could not interpret."""
    bundle = InputBundle(startupName="X", manual=ManualAnswers(vcAnswers=VC_ANSWERS))
    assert "vcInputs" not in digest_bundle(bundle)["founderSuppliedAnswers"]


def test_a_bundle_with_no_calculator_answers_still_digests():
    supplied = digest_bundle(InputBundle(startupName="X"))["founderSuppliedAnswers"]
    assert supplied["vcMethodInputs"] is None
    assert supplied["firstChicagoInputs"] is None
