"""Competitive landscape and defensibility."""

from __future__ import annotations

from typing import Any

from ..jsonspec import array, enum, methodology_schema, number, obj, string
from ..schemas import ComputeOutput
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp

#: Moats that survive contact with a funded competitor.
MOAT_TYPES = [
    "network_effects", "switching_costs", "economies_of_scale", "brand",
    "patents_ip", "regulatory_licence", "proprietary_data", "distribution_lock_in",
    "technical_difficulty", "none_identified",
]

DURABLE_MOATS = {
    "network_effects", "switching_costs", "economies_of_scale",
    "patents_ip", "regulatory_licence", "proprietary_data", "distribution_lock_in",
}


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    position = clamp(inputs.get("positionScore10"), 0, 10, 0)
    defensibility = clamp(inputs.get("defensibilityScore10"), 0, 10, 0)

    raw_moats = inputs.get("moats")
    moats = [str(item) for item in raw_moats] if isinstance(raw_moats, list) else []
    durable = [moat for moat in moats if moat in DURABLE_MOATS]

    competitors = inputs.get("competitors")
    competitor_count = len(competitors) if isinstance(competitors, list) else 0

    # Defensibility is the half of this that survives a well-funded entrant.
    score10 = round(position * 0.4 + defensibility * 0.6, 1)

    notes: list[str] = []
    if competitor_count == 0:
        notes.append(
            "No competitors were identified. A claim of no competition is almost always a "
            "market-definition problem, not a fact."
        )
    if not durable:
        notes.append("No durable moat was identified — a first-mover advantage or a better product is not a moat.")

    return ComputeOutput(
        score10=score10,
        computed={
            "positionScore10": position,
            "defensibilityScore10": defensibility,
            "competitorCount": competitor_count,
            "moats": moats,
            "durableMoats": durable,
            "hasDurableMoat": bool(durable),
        },
        confidencePenalty=0.2 if competitor_count == 0 else 0.0,
        notes=notes,
    )


SPEC = MethodologySpec(
    id="competitive_analysis",
    name="Competitive Analysis",
    family="competitive",
    description="Maps the real competitive set, including status-quo alternatives, and tests whether any advantage is durable.",
    purpose="Distinguishes a genuine moat from a head start.",
    required_inputs=[
        InputSpec("product", "Product description", "What the company sells."),
        InputSpec("market", "Market", "Where it competes."),
    ],
    optional_inputs=[
        InputSpec("competitors", "Named competitors", "Competitors the founder named."),
        InputSpec("ip", "IP position", "Patents, trade secrets, licences."),
    ],
    output_schema=methodology_schema(obj({
        "competitors": array(
            obj({
                "name": string("Competitor or alternative. Include the status quo (spreadsheets, doing nothing) where that is the real competition."),
                "type": enum(["direct", "indirect", "status_quo", "adjacent_entrant"], "Kind of competitive threat."),
                "strength": string("What they do better."),
                "weakness": string("Where they are vulnerable."),
            }),
            "The real competitive set. Do not return an empty list because the deck claims there is no competition.",
        ),
        "positionScore10": number("0-10 current competitive position.", 0, 10),
        "defensibilityScore10": number("0-10 durability of the advantage against a well-funded entrant.", 0, 10),
        "moats": array(enum(MOAT_TYPES, "Moat type."), "Moats that are actually evidenced. Use none_identified rather than reaching."),
        "moatEvidence": string("The evidence for each claimed moat. If the only advantage is being first or being better, say so."),
        "differentiation": string("What this company does that the alternatives cannot easily copy."),
        "threatOfEntry": string("How hard it would be for a funded team to replicate this in 12 months."),
        "concentrationRisk": string("Dependence on a single platform, supplier or customer."),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.62,
    limitations=[
        "No live competitor database: the set is drawn from the deck plus general knowledge, so recent entrants may be missing.",
        "Private competitors' traction and funding cannot be verified here.",
    ],
    priority=15,
    instruction=(
        "Map the real competitive set including the status quo, then judge how durable this company's advantage is against a "
        "well-funded entrant. Only list a moat where you can point to the evidence for it. Treat a claim of no competition as a "
        "finding about the founder's market understanding."
    ),
    compute=_compute,
    gate=lambda _profile, _bundle: Applicability(
        True, 0.85, "Defensibility determines whether any of the upside in the other methodologies is actually capturable."
    ),
)
