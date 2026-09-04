"""Scorecard (Payne) Method — adjust a regional/sector median pre-money
valuation by seven weighted comparison factors."""

from __future__ import annotations

from typing import Any, Optional, Sequence

from ..jsonspec import methodology_schema, number, obj, string
from ..schemas import ComputeOutput, InputBundle, StartupProfile, ValuationRange
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, to_float

SCORECARD_FACTOR_KEYS = ["team", "market", "product", "competitive", "sales", "financing", "other"]
SCORECARD_WEIGHTS = [0.30, 0.25, 0.15, 0.10, 0.10, 0.05, 0.05]

#: The five allowed comparison scores, as a percentage of the median company.
SCORECARD_SCORE_VALUES = [60, 80, 100, 120, 150]


def compute_scorecard_weight(scores: Sequence[Optional[float]]) -> float:
    """Sum(score/100 x weight). 1.0 means 'exactly the median company'."""
    total = 0.0
    for index, weight in enumerate(SCORECARD_WEIGHTS):
        score = scores[index] if index < len(scores) else None
        if score is None:
            continue
        total += (score / 100.0) * weight
    return total


def compute_scorecard(scores: Sequence[Optional[float]], median_valuation: float) -> float:
    return round((median_valuation or 0) * compute_scorecard_weight(scores))


def snap_scorecard_score(value: Any) -> int:
    """Snap a free number onto the nearest allowed grid value."""
    number_value = to_float(value, 100.0)
    return min(SCORECARD_SCORE_VALUES, key=lambda candidate: abs(candidate - number_value))


def _step(value: int, direction: int) -> int:
    index = SCORECARD_SCORE_VALUES.index(value)
    return SCORECARD_SCORE_VALUES[max(0, min(len(SCORECARD_SCORE_VALUES) - 1, index + direction))]


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    factors = inputs.get("factors") or {}
    scores = [snap_scorecard_score((factors.get(key) or {}).get("score")) for key in SCORECARD_FACTOR_KEYS]

    median = max(0.0, to_float(inputs.get("medianPreMoneyUsd")))
    median_low = max(0.0, to_float(inputs.get("medianLowUsd")) or median * 0.75)
    median_high = max(0.0, to_float(inputs.get("medianHighUsd")) or median * 1.25)

    weight = compute_scorecard_weight(scores)
    weight_low = compute_scorecard_weight([_step(score, -1) for score in scores])
    weight_high = compute_scorecard_weight([_step(score, 1) for score in scores])

    point = round(median * weight)
    no_median = median <= 0

    return ComputeOutput(
        valuation=None if no_median else ValuationRange(
            low=round(median_low * weight_low), point=point, high=round(median_high * weight_high),
        ),
        # 1.0 weight (the median company) maps to 5/10; the 1.5 ceiling to 10/10.
        score10=round(max(0.0, min(10.0, weight * 10 - 5)), 1),
        computed={
            "scores": dict(zip(SCORECARD_FACTOR_KEYS, scores)),
            "weightedMultiple": round(weight, 3),
            "medianPreMoneyUsd": median,
            "medianBandUsd": [median_low, median_high],
            "valuationUsd": point,
            "bandBasis": "median comparables band × factor scores stepped ±1 grid position",
        },
        confidencePenalty=0.5 if no_median else 0.0,
        notes=(
            ["No credible median pre-money valuation for comparable companies was available, so Scorecard cannot produce a valuation."]
            if no_median else []
        ),
    )


def _gate(profile: StartupProfile, bundle: InputBundle) -> Applicability:
    if profile.stage == "growth":
        return Applicability(False, 0.2, "Scorecard is calibrated to angel/seed comparables and loses meaning at growth stage.")
    if profile.stage == "idea":
        return Applicability(True, 0.45, "Usable at idea stage, but comparables for unfunded ideas are thin, so treat the anchor as weak.")

    median = bundle.manual.scorecardMedian or 0
    return Applicability(
        True, 0.9,
        f"The founder supplied a ${median:,.0f} comparables median, which the agent will sanity-check against the sector."
        if median > 0 else
        "Stage and sector are well covered by angel/seed comparables data.",
    )


def _factor(label: str, question: str):
    return obj({
        "score": number(f"One of 60, 80, 100, 120 or 150. 100 = same as the median comparable company. {question}", 60, 150),
        "justification": string(f"Evidence supporting this {label} comparison."),
    })


SPEC = MethodologySpec(
    id="scorecard",
    name="Scorecard Method",
    family="valuation",
    description="Benchmarks the startup against the median funded company in its region and sector across seven weighted factors.",
    purpose="Anchors valuation to what comparable companies actually raise at, rather than to internal projections.",
    required_inputs=[
        InputSpec("median", "Median pre-money of comparables", "Typical pre-money for funded startups at this stage/sector/geography."),
        InputSpec("team", "Team strength", "Founder and team quality vs peers."),
        InputSpec("market", "Market opportunity", "Size and growth vs peers."),
    ],
    optional_inputs=[
        InputSpec("product", "Product/technology", "Product maturity vs peers."),
        InputSpec("competitive", "Competitive environment", "Position vs peers."),
        InputSpec("sales", "Sales channels", "Marketing and sales channels vs peers."),
        InputSpec("financing", "Need for further investment", "Capital requirement vs peers."),
    ],
    output_schema=methodology_schema(obj({
        "medianPreMoneyUsd": number("Median pre-money valuation (USD) for comparable funded startups at this stage, sector and geography."),
        "medianLowUsd": number("Low end of the comparables band (USD)."),
        "medianHighUsd": number("High end of the comparables band (USD)."),
        "medianBasis": string("How you arrived at that comparables band. Say plainly if it is a rule of thumb rather than observed data."),
        "factors": obj({
            "team": _factor("team", "Strength of the entrepreneur and management team."),
            "market": _factor("market", "Size and growth of the opportunity."),
            "product": _factor("product", "Product and technology maturity and differentiation."),
            "competitive": _factor("competitive environment", "Competitive position and defensibility."),
            "sales": _factor("sales channels", "Marketing, sales channels and partnerships."),
            "financing": _factor("need for further investment", "Capital efficiency and further funding required."),
            "other": _factor("other factors", "Anything else material (regulatory, timing, geography)."),
        }),
    })),
    applicable_stages=["pre_seed", "seed", "series_a"],
    base_confidence=0.72,
    limitations=[
        "Entirely dependent on the credibility of the comparables median — a bad anchor makes the whole result wrong.",
        "Relative, not absolute: it says how this company compares, not what it is worth in isolation.",
        "Weights are fixed by the published method and are not tuned per sector.",
    ],
    priority=20,
    instruction=(
        "First establish a defensible median pre-money valuation band for comparable funded startups at this stage, sector and "
        "geography, and state your basis honestly. Then score each of the seven Scorecard factors against that median company, "
        "using only 60, 80, 100, 120 or 150. Do NOT compute the valuation — the platform applies the published weights to your scores."
    ),
    compute=_compute,
    gate=_gate,
)
