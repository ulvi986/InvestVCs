"""Market opportunity analysis — size, growth, timing, and the credibility of
the founder's own sizing."""

from __future__ import annotations

from typing import Any

from ..jsonspec import array, boolean, enum, methodology_schema, number, obj, string
from ..schemas import ComputeOutput, StartupProfile
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp, to_float


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    attractiveness = clamp(inputs.get("attractivenessScore10"), 0, 10, 0)
    sizing_credibility = clamp(inputs.get("sizingCredibilityScore10"), 0, 10, 0)
    timing = clamp(inputs.get("timingScore10"), 0, 10, 0)

    # A TAM with no stated derivation is the most common unsupported claim in a
    # deck, so sizing credibility is scored separately and drags the headline
    # down when it is weak.
    score10 = round(attractiveness * 0.5 + sizing_credibility * 0.3 + timing * 0.2, 1)

    tam = to_float(inputs.get("tamUsd"))
    sam = to_float(inputs.get("samUsd"))
    som = to_float(inputs.get("somUsd"))
    has_funnel = tam > 0 and sam > 0 and som > 0

    notes: list[str] = []
    if has_funnel:
        if sam > tam:
            notes.append("SAM exceeds TAM — the sizing is internally inconsistent.")
        if som > sam:
            notes.append("SOM exceeds SAM — the sizing is internally inconsistent.")
        if som / tam > 0.2:
            notes.append(
                f"The obtainable market is {round(som / tam * 100)}% of the total market, "
                "which is implausibly high for an early-stage company."
            )
    if sizing_credibility < 4:
        notes.append("Market sizing rests on figures whose derivation could not be established.")

    return ComputeOutput(
        score10=score10,
        computed={
            "attractivenessScore10": attractiveness,
            "sizingCredibilityScore10": sizing_credibility,
            "timingScore10": timing,
            "tamUsd": tam or None,
            "samUsd": sam or None,
            "somUsd": som or None,
            "sizingConsistent": (sam <= tam and som <= sam) if has_funnel else None,
            "somShareOfTam": round(som / tam, 3) if has_funnel else None,
        },
        confidencePenalty=0.2 if sizing_credibility < 4 else (0.1 if sizing_credibility < 7 else 0.0),
        notes=notes,
    )


SPEC = MethodologySpec(
    id="market_analysis",
    name="Market Analysis",
    family="market",
    description="Sizes the opportunity, tests the credibility of that sizing, and judges whether now is the right time to enter.",
    purpose="Separates a large market from a large number in a deck.",
    required_inputs=[InputSpec("market", "Market description", "Who the customer is and what they currently do instead.")],
    optional_inputs=[
        InputSpec("tam", "Founder market sizing", "TAM/SAM/SOM as claimed."),
        InputSpec("growth", "Growth rate", "Market growth rate."),
    ],
    output_schema=methodology_schema(obj({
        "marketDefinition": string("The market this company actually competes in — narrower than the one the deck claims, if so."),
        "tamUsd": number("Total addressable market (USD). 0 if it cannot be established."),
        "samUsd": number("Serviceable available market (USD). 0 if it cannot be established."),
        "somUsd": number("Serviceable obtainable market (USD) over the plan horizon. 0 if it cannot be established."),
        "sizingMethod": enum(
            ["bottom_up", "top_down", "founder_claim_unverified", "not_established"],
            "How the sizing above was actually derived.",
        ),
        "sizingBasis": string("Show the derivation. If you are repeating the founder's number without being able to check it, say exactly that."),
        "growthRatePct": number("Annual market growth rate (%). 0 if unknown."),
        "attractivenessScore10": number("0-10 market attractiveness: size, growth, willingness to pay, fragmentation.", 0, 10),
        "sizingCredibilityScore10": number("0-10 credibility of the sizing above. Score low when the number is asserted rather than derived.", 0, 10),
        "timingScore10": number("0-10 market timing: why now rather than three years ago or three years from now.", 0, 10),
        "whyNow": string("The specific change that makes this the right moment, or the absence of one."),
        "customerEvidence": string("Evidence of real demand: pilots, LOIs, paying customers, waitlists — or its absence."),
        "segments": array(string("A customer segment with its own buying behaviour."), "Distinct segments."),
        "headwinds": array(string("A structural headwind in this market."), "Headwinds."),
        "isRegulated": boolean("Does entering this market require regulatory approval?"),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.65,
    limitations=[
        "No live market-data connection: sizing rests on the founder's figures and general sector knowledge, not a queried database.",
        "Model knowledge has a training cutoff, so very recent market shifts may be missed.",
    ],
    priority=10,
    instruction=(
        "Define the market this company actually competes in, then size it. State plainly whether each figure is derived bottom-up, "
        "taken top-down, or repeated from the founder without verification. Score sizing credibility honestly — a large unverified "
        "TAM must not raise the score. Never present a figure you cannot show the derivation for as established."
    ),
    compute=_compute,
    gate=lambda _profile, _bundle: Applicability(
        True, 0.95, "Market opportunity bounds every valuation method downstream, so it runs for every startup."
    ),
)
