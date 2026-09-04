"""Berkus Method — pre-revenue valuation from five qualitative components."""

from __future__ import annotations

from typing import Any, Optional, Sequence

from ..jsonspec import methodology_schema, number, obj, string
from ..schemas import ComputeOutput, InputBundle, StartupProfile, ValuationRange
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp_int

BERKUS_SCORE_TO_VALUE: dict[int, float] = {0: 0, 1: 70_000, 2: 150_000, 3: 250_000, 4: 400_000, 5: 500_000}
BERKUS_COMPONENT_KEYS = ["sound_idea", "prototype", "team", "strategic", "traction"]

#: Highest attainable Berkus valuation (5 components x $500k).
BERKUS_MAX = len(BERKUS_COMPONENT_KEYS) * BERKUS_SCORE_TO_VALUE[5]


def compute_berkus(scores: Sequence[Optional[float]]) -> float:
    """Sum the component values. `None` counts as unanswered (0), as in the UI."""
    total = 0.0
    for score in scores:
        if score is None:
            continue
        total += BERKUS_SCORE_TO_VALUE.get(int(score), 0)
    return total


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    components = inputs.get("components") or {}
    scores = [clamp_int((components.get(key) or {}).get("score"), 0, 5) for key in BERKUS_COMPONENT_KEYS]

    point = compute_berkus(scores)
    # Sensitivity band: step every component one grid position down / up. An
    # honest range for a five-bucket ordinal scale — averaging the uncertainty
    # away would hide exactly what an investor needs to see.
    low = compute_berkus([max(0, score - 1) for score in scores])
    high = compute_berkus([min(5, score + 1) for score in scores])

    unjustified = [
        key for key in BERKUS_COMPONENT_KEYS
        if not str((components.get(key) or {}).get("justification") or "").strip()
    ]

    return ComputeOutput(
        valuation=ValuationRange(low=low, point=point, high=high),
        score10=round(point / BERKUS_MAX * 10, 1),
        computed={
            "scores": dict(zip(BERKUS_COMPONENT_KEYS, scores)),
            "componentValuesUsd": {key: BERKUS_SCORE_TO_VALUE[score] for key, score in zip(BERKUS_COMPONENT_KEYS, scores)},
            "totalUsd": point,
            "capUsd": BERKUS_MAX,
            "bandBasis": "each component stepped ±1 grid position",
        },
        confidencePenalty=len(unjustified) * 0.08,
        notes=(
            [f"{len(unjustified)} component(s) scored without a written justification: {', '.join(unjustified)}."]
            if unjustified else []
        ),
    )


def _gate(profile: StartupProfile, bundle: InputBundle) -> Applicability:
    revenue = profile.traction.revenueUsd or 0
    if profile.stage in ("series_a", "growth"):
        return Applicability(False, 0.1, "Berkus is a pre-revenue method capped at $2.5M; this company is past that stage.")
    if revenue > 1_000_000:
        return Applicability(False, 0.2, f"Reported revenue of ${revenue:,.0f} puts the company beyond the pre-revenue band Berkus is built for.")

    answered = len([value for value in bundle.manual.berkusAnswers if value is not None])
    return Applicability(
        True,
        0.6 if revenue > 0 else 0.9,
        f"Pre-revenue-stage company; the founder already scored {answered}/5 Berkus components, which the agent will cross-check."
        if answered else
        "Early-stage company with no meaningful revenue — Berkus prices the de-risking that has actually happened.",
    )


def _component(label: str, question: str):
    return obj({
        "score": number(f"0-5. {question}", 0, 5),
        "justification": string(f"Evidence from the startup's material that supports this {label} score."),
    })


SPEC = MethodologySpec(
    id="berkus",
    name="Berkus Method",
    family="valuation",
    description="Assigns up to $500k of value to each of five pre-revenue risk-reduction milestones, capped at $2.5M.",
    purpose="Puts a floor-and-ceiling on a pre-revenue company by pricing de-risking, not projections.",
    required_inputs=[
        InputSpec("idea", "Idea / value proposition", "What the company does and why it matters."),
        InputSpec("prototype", "Prototype maturity", "Working product evidence."),
        InputSpec("team", "Management team", "Founder and team quality."),
    ],
    optional_inputs=[
        InputSpec("strategic", "Strategic relationships", "Partnerships, LOIs, channel deals."),
        InputSpec("traction", "Product rollout / traction", "Customers, pilots, revenue."),
    ],
    output_schema=methodology_schema(obj({
        "components": obj({
            "sound_idea": _component("sound idea", "Is the core idea and value proposition sound and differentiated?"),
            "prototype": _component("prototype", "How far past concept is the working product (reduces technology risk)?"),
            "team": _component("management team", "How strong is the team relative to what this business demands (reduces execution risk)?"),
            "strategic": _component("strategic relationships", "Are there partnerships, LOIs or channels that reduce market risk?"),
            "traction": _component("product rollout", "Is there rollout/traction evidence that reduces production and market risk?"),
        }),
    })),
    applicable_stages=["idea", "pre_seed", "seed"],
    base_confidence=0.7,
    limitations=[
        "Caps out at $2.5M — cannot value a company that has outgrown the pre-revenue band.",
        "Ignores market size and unit economics entirely.",
        "The five buckets are US-centric and not adjusted for geography.",
    ],
    priority=20,
    instruction=(
        "Score each of the five Berkus components from 0 to 5 for this startup, where 0 = no evidence and 5 = fully de-risked. "
        "Score strictly on the evidence available; where a component is unevidenced, score it low and say so in missingInputs "
        "rather than assuming the best case. Do NOT compute a valuation — the platform applies the Berkus grid to your scores."
    ),
    compute=_compute,
    gate=_gate,
)
