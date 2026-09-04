"""First Chicago Method — probability-weighted worst / base / best scenarios,
each discounted at its own rate."""

from __future__ import annotations

from typing import Any

from ..jsonspec import methodology_schema, number, obj, string
from ..schemas import ComputeOutput, StartupProfile, ValuationRange
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp, to_float

CHICAGO_SCENARIOS = ["worst", "base", "best"]


def compute_chicago_breakdown(
    *, revenue: float, exit_multiple: float, years_to_exit: float,
    discount_rates: dict[str, float], probabilities: dict[str, float],
) -> dict[str, Any]:
    exit_value = revenue * exit_multiple
    present_values = {
        scenario: exit_value / ((1 + (discount_rates.get(scenario) or 0) / 100.0) ** years_to_exit)
        for scenario in CHICAGO_SCENARIOS
    }
    weighted = sum(
        present_values[scenario] * (probabilities.get(scenario) or 0) / 100.0
        for scenario in CHICAGO_SCENARIOS
    )
    return {"exitValue": exit_value, "presentValues": present_values, "weighted": weighted}


def compute_chicago_valuation(
    *, revenue: float, exit_multiple: float, years_to_exit: float,
    discount_rates: dict[str, float], probabilities: dict[str, float],
) -> float:
    if not revenue:
        return 0.0
    return round(compute_chicago_breakdown(
        revenue=revenue, exit_multiple=exit_multiple, years_to_exit=years_to_exit,
        discount_rates=discount_rates, probabilities=probabilities,
    )["weighted"])


def normalise_probabilities(raw: dict[str, Any]) -> dict[str, int]:
    """Rescale to sum to 100 without letting one scenario vanish."""
    values = [max(0.0, to_float(raw.get(scenario))) for scenario in CHICAGO_SCENARIOS]
    total = sum(values)
    if total <= 0:
        return {"worst": 20, "base": 70, "best": 10}
    scaled = [value / total * 100.0 for value in values]
    # Push rounding drift into the base case so the three always sum to 100.
    worst, best = round(scaled[0]), round(scaled[2])
    return {"worst": worst, "base": 100 - worst - best, "best": best}


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    scenarios = inputs.get("scenarios") or {}
    probabilities = normalise_probabilities({
        scenario: (scenarios.get(scenario) or {}).get("probabilityPct") for scenario in CHICAGO_SCENARIOS
    })
    discount_rates = {
        "worst": max(1.0, to_float((scenarios.get("worst") or {}).get("discountRatePct"), 50)),
        "base": max(1.0, to_float((scenarios.get("base") or {}).get("discountRatePct"), 30)),
        "best": max(1.0, to_float((scenarios.get("best") or {}).get("discountRatePct"), 20)),
    }

    revenue = max(0.0, to_float(inputs.get("exitYearRevenueUsd")))
    exit_multiple = max(0.0, to_float(inputs.get("exitMultiple")))
    years = clamp(inputs.get("yearsToExit"), 1, 15, 5)

    breakdown = compute_chicago_breakdown(
        revenue=revenue, exit_multiple=exit_multiple, years_to_exit=years,
        discount_rates=discount_rates, probabilities=probabilities,
    )
    point = round(breakdown["weighted"])
    no_revenue = revenue <= 0

    return ComputeOutput(
        valuation=None if no_revenue else ValuationRange(
            low=round(breakdown["presentValues"]["worst"]),
            point=point,
            high=round(breakdown["presentValues"]["best"]),
        ),
        computed={
            "exitValueUsd": round(breakdown["exitValue"]),
            "presentValuesUsd": {key: round(value) for key, value in breakdown["presentValues"].items()},
            "probabilities": probabilities,
            "discountRates": discount_rates,
            "weightedValuationUsd": point,
            "bandBasis": "worst-case and best-case present values, not a symmetric band",
        },
        confidencePenalty=0.5 if no_revenue else 0.0,
        notes=(["No credible exit-year revenue projection was available, so First Chicago cannot produce a valuation."]
               if no_revenue else []),
    )


def _gate(profile: StartupProfile, _bundle) -> Applicability:
    if profile.stage in ("idea", "pre_seed"):
        return Applicability(
            False, 0.2,
            "Scenario weighting needs a revenue base to differentiate the scenarios; at this stage all three would be guesses.",
        )
    return Applicability(
        True, 0.85,
        "Stage supports a revenue projection, and the outcome distribution is wide enough that a single point estimate would mislead.",
    )


def _scenario(label: str):
    return obj({
        "narrative": string(f"What has to happen for the {label} case."),
        "probabilityPct": number(f"Probability (%) of the {label} case. The three must sum to 100.", 0, 100),
        "discountRatePct": number(f"Discount rate (%) appropriate to the risk of the {label} case.", 1, 200),
    })


SPEC = MethodologySpec(
    id="first_chicago",
    name="First Chicago Method",
    family="valuation",
    description="Values three explicit scenarios at their own discount rates and weights them by probability.",
    purpose="Makes the distribution of outcomes visible instead of collapsing it into a single point estimate.",
    required_inputs=[
        InputSpec("exitRevenue", "Exit-year revenue", "Revenue projection at exit."),
        InputSpec("scenarios", "Scenario definitions", "Worst/base/best narratives and probabilities."),
    ],
    optional_inputs=[InputSpec("multiple", "Exit multiple", "Comparable exit multiple.")],
    output_schema=methodology_schema(obj({
        "exitYearRevenueUsd": number("Base-case revenue (USD) in the exit year. 0 if no credible projection exists."),
        "exitMultiple": number("Revenue multiple at exit."),
        "yearsToExit": number("Years to exit.", 1, 15),
        "basis": string("How the projection and multiple were derived."),
        "scenarios": obj({
            "worst": _scenario("worst"),
            "base": _scenario("base"),
            "best": _scenario("best"),
        }),
    })),
    applicable_stages=["seed", "series_a", "growth"],
    base_confidence=0.62,
    limitations=[
        "Scenario probabilities are judgement calls and are rarely calibrated.",
        "Needs a revenue projection, so it inherits every weakness of that projection.",
        "Three scenarios is a coarse approximation of a continuous outcome distribution.",
    ],
    priority=30,
    instruction=(
        "Define genuinely distinct worst, base and best scenarios for this company, each with a probability (summing to 100) and "
        "its own discount rate reflecting that scenario's risk. Ground the base case in the evidence available; do not make the "
        "worst case a mild version of the base case. Do NOT compute the weighted valuation — the platform does that."
    ),
    compute=_compute,
    gate=_gate,
)
