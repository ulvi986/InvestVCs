"""VC Method — discount a projected exit value back at the investor's required
rate of return."""

from __future__ import annotations

from typing import Any

from ..jsonspec import methodology_schema, number, obj, string
from ..schemas import ComputeOutput, InputBundle, StartupProfile, ValuationRange
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp, to_float


def compute_vc_breakdown(
    *, revenue: float, exit_multiple: float, exit_years: float, required_irr: float,
    investment_amount: float, net_income_margin: float = 0.0,
) -> dict[str, float]:
    exit_value = revenue * exit_multiple
    post_money = exit_value / ((1 + required_irr / 100.0) ** exit_years) if exit_years >= 0 else 0.0
    pre_money = max(0.0, post_money - investment_amount)
    return {
        "exitValue": exit_value,
        "postMoney": post_money,
        "preMoney": pre_money,
        "investorOwnershipPct": (investment_amount / post_money * 100.0) if post_money > 0 else 0.0,
        "netIncomeAtExit": revenue * (net_income_margin / 100.0),
    }


def compute_vc_valuation(
    *, revenue: float, exit_multiple: float, exit_years: float, required_irr: float, investment_amount: float,
) -> float:
    """Pre-money valuation, rounded — the figure the manual calculator shows."""
    if not revenue:
        return 0.0
    return max(0.0, round(compute_vc_breakdown(
        revenue=revenue, exit_multiple=exit_multiple, exit_years=exit_years,
        required_irr=required_irr, investment_amount=investment_amount,
    )["preMoney"]))


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    revenue = max(0.0, to_float(inputs.get("exitYearRevenueUsd")))
    exit_multiple = max(0.0, to_float(inputs.get("exitMultiple")))
    exit_years = clamp(inputs.get("yearsToExit"), 1, 15, 5)
    required_irr = clamp(inputs.get("requiredIrrPct"), 1, 200, 30)
    investment = max(0.0, to_float(inputs.get("investmentAmountUsd")))
    margin = max(0.0, to_float(inputs.get("netIncomeMarginPct")))

    base = compute_vc_breakdown(
        revenue=revenue, exit_multiple=exit_multiple, exit_years=exit_years,
        required_irr=required_irr, investment_amount=investment, net_income_margin=margin,
    )
    point = max(0.0, round(base["preMoney"]))
    no_revenue = revenue <= 0

    # The band comes from the two assumptions that actually move the number:
    # the exit multiple and the required IRR.
    multiple_low = max(0.0, to_float(inputs.get("exitMultipleLow")) or exit_multiple * 0.7)
    multiple_high = max(0.0, to_float(inputs.get("exitMultipleHigh")) or exit_multiple * 1.3)
    low = round(compute_vc_breakdown(
        revenue=revenue, exit_multiple=multiple_low, exit_years=exit_years,
        required_irr=required_irr + 10, investment_amount=investment,
    )["preMoney"])
    high = round(compute_vc_breakdown(
        revenue=revenue, exit_multiple=multiple_high, exit_years=exit_years,
        required_irr=max(1.0, required_irr - 10), investment_amount=investment,
    )["preMoney"])

    return ComputeOutput(
        valuation=None if no_revenue else ValuationRange(low=max(0.0, low), point=point, high=max(point, high)),
        computed={
            "exitValueUsd": round(base["exitValue"]),
            "postMoneyUsd": round(base["postMoney"]),
            "preMoneyUsd": point,
            "investorOwnershipPct": round(base["investorOwnershipPct"], 1),
            "netIncomeAtExitUsd": round(base["netIncomeAtExit"]),
            "inputsUsed": {
                "revenue": revenue, "exitMultiple": exit_multiple, "exitYears": exit_years,
                "requiredIRR": required_irr, "investmentAmount": investment,
            },
            "bandBasis": "exit multiple ×0.7/×1.3 combined with required IRR ±10 points",
        },
        confidencePenalty=0.5 if no_revenue else 0.0,
        notes=(["No credible exit-year revenue projection was available, so the VC Method cannot produce a valuation."]
               if no_revenue else []),
    )


def _gate(profile: StartupProfile, bundle: InputBundle) -> Applicability:
    revenue = profile.traction.revenueUsd or 0
    manual_revenue = to_float((bundle.manual.vcAnswers or {}).get("revenue"))

    if profile.stage == "idea":
        return Applicability(False, 0.1, "No revenue basis at idea stage; a projected exit multiple would be pure fiction.")
    if not revenue and not manual_revenue and profile.stage == "pre_seed":
        return Applicability(False, 0.25, "Pre-seed with no revenue or projection on file — the VC Method would amplify a guess into a valuation.")

    return Applicability(
        True, 0.9 if revenue > 0 else 0.55,
        f"Reported revenue of ${revenue:,.0f} gives a real base to project from." if revenue > 0
        else "Stage is late enough that a projection is defensible, though the absence of current revenue widens the band.",
    )


SPEC = MethodologySpec(
    id="vc_method",
    name="VC Method",
    family="valuation",
    description="Projects revenue at exit, applies an exit multiple, and discounts back at the investor's required IRR to a pre-money value.",
    purpose="Answers what an investor can pay today and still clear their target return.",
    required_inputs=[
        InputSpec("exitRevenue", "Exit-year revenue", "Credible revenue projection at exit."),
        InputSpec("multiple", "Exit multiple", "Revenue multiple comparable exits achieved."),
        InputSpec("irr", "Required IRR", "Investor's target return for this stage."),
    ],
    optional_inputs=[
        InputSpec("investment", "Investment amount", "Round size being raised."),
        InputSpec("margin", "Net income margin", "Margin at exit."),
    ],
    output_schema=methodology_schema(obj({
        "exitYearRevenueUsd": number("Projected revenue (USD) in the exit year. 0 if no credible projection exists."),
        "revenueBasis": string("How the projection was derived, and how much of it is the founder's claim vs your own reasoning."),
        "netIncomeMarginPct": number("Expected net income margin at exit (%).", 0, 100),
        "exitMultiple": number("Revenue multiple comparable companies exit at."),
        "exitMultipleLow": number("Low end of the credible exit-multiple range."),
        "exitMultipleHigh": number("High end of the credible exit-multiple range."),
        "multipleBasis": string("Which comparable exits or sector norms support that multiple."),
        "yearsToExit": number("Years to exit.", 1, 15),
        "requiredIrrPct": number("Investor's required IRR (%) for this stage and risk level.", 1, 200),
        "investmentAmountUsd": number("Amount being raised in this round (USD). 0 if unknown."),
    })),
    applicable_stages=["seed", "series_a", "growth"],
    base_confidence=0.6,
    limitations=[
        "Extremely sensitive to the exit multiple and IRR — small assumption changes swing the result by multiples.",
        "Requires a credible revenue projection, which pre-revenue companies do not have.",
        "Assumes a single exit event and ignores dilution from later rounds.",
    ],
    priority=30,
    instruction=(
        "Establish a defensible exit-year revenue projection, exit multiple range, time to exit and required IRR for this company's "
        "stage and sector. State clearly which figures are the founder's claims and which are your own reasoning. If no credible "
        "revenue projection exists, return 0 for exitYearRevenueUsd rather than inventing one. "
        "Do NOT compute the valuation — the platform applies the discounting."
    ),
    compute=_compute,
    gate=_gate,
)
