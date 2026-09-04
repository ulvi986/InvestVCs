"""Team and traction assessment.

One methodology because at early stage the honest question is a single one:
has this specific team produced evidence that this specific thing works?
"""

from __future__ import annotations

from typing import Any

from ..jsonspec import array, boolean, enum, methodology_schema, number, obj, string
from ..schemas import ComputeOutput
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp

#: Traction claims ranked by how hard they are to fake.
TRACTION_QUALITY: dict[str, float] = {
    "paying_customers": 1.0,
    "signed_contracts": 0.9,
    "paid_pilots": 0.8,
    "letters_of_intent": 0.5,
    "free_pilots": 0.4,
    "waitlist": 0.25,
    "user_signups": 0.25,
    "none": 0.0,
}


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    team = clamp(inputs.get("teamScore10"), 0, 10, 0)
    traction = clamp(inputs.get("tractionScore10"), 0, 10, 0)

    evidence_type = str(inputs.get("strongestTractionEvidence") or "none")
    evidence_weight = TRACTION_QUALITY.get(evidence_type, 0.0)

    # Soft-traction claims are discounted: a waitlist is not revenue.
    adjusted_traction = round(traction * (0.5 + 0.5 * evidence_weight), 1)
    score10 = round(team * 0.5 + adjusted_traction * 0.5, 1)

    notes: list[str] = []
    if evidence_weight <= 0.25 and traction >= 6:
        notes.append(
            f"Traction was scored {traction}/10 but the strongest evidence is {evidence_type}, which does not "
            "demonstrate willingness to pay. The score has been discounted accordingly."
        )
    if inputs.get("hasTechnicalCofounder") is False:
        notes.append("No technical co-founder identified, which matters for a company whose core risk is technical.")

    return ComputeOutput(
        score10=score10,
        computed={
            "teamScore10": team,
            "rawTractionScore10": traction,
            "adjustedTractionScore10": adjusted_traction,
            "strongestTractionEvidence": evidence_type,
            "tractionEvidenceWeight": evidence_weight,
        },
        confidencePenalty=0.2 if evidence_type == "none" else 0.0,
        notes=notes,
    )


SPEC = MethodologySpec(
    id="team_traction",
    name="Team & Traction",
    family="team",
    description="Assesses founder-market fit and grades traction by the quality of its evidence rather than its headline number.",
    purpose="Separates demonstrated demand from claimed interest, and asks whether this team is the one to execute this plan.",
    required_inputs=[InputSpec("team", "Team", "Founders and key hires.")],
    optional_inputs=[InputSpec("traction", "Traction", "Customers, revenue, pilots.")],
    output_schema=methodology_schema(obj({
        "teamScore10": number("0-10 founder-market fit and ability to execute this specific plan.", 0, 10),
        "founderMarketFit": string("Why this team specifically, or why not. Name the relevant experience."),
        "teamGaps": array(string("A missing role or capability."), "Gaps the company must hire into."),
        "hasTechnicalCofounder": boolean("Is there a technical co-founder or equivalent in-house technical leadership?"),
        "keyPersonRisk": string("Dependence on a single individual."),
        "tractionScore10": number("0-10 traction quality relative to time and capital spent.", 0, 10),
        "strongestTractionEvidence": enum(
            list(TRACTION_QUALITY.keys()),
            "The hardest form of traction evidence actually present. Do not upgrade a pilot to a customer.",
        ),
        "tractionNarrative": string("What the traction actually demonstrates, and over what period."),
        "growthEvidence": string("Growth rate and the period it covers, or the absence of a time series."),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.68,
    limitations=[
        "Team assessment from written material cannot judge the things references would reveal.",
        "Traction figures are self-reported and unverified.",
    ],
    priority=15,
    instruction=(
        "Assess whether this specific team can execute this specific plan, and grade traction by the quality of its evidence. "
        "Classify the strongest traction evidence honestly — a letter of intent is not a signed contract and a waitlist is not revenue."
    ),
    compute=_compute,
    gate=lambda _profile, _bundle: Applicability(
        True, 0.9, "At early stage the team and the evidence of demand are the two things an investor is actually underwriting."
    ),
)
