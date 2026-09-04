"""Technology / Commercial / Funding Readiness Levels (TRL, CRL, FRL)."""

from __future__ import annotations

from typing import Any, Optional

from ..jsonspec import array, methodology_schema, number, obj, string
from ..schemas import ComputeOutput, InputBundle, StartupProfile
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp_int

READINESS_MAX_LEVEL = 9

#: [mandatory, supportive] criteria counts per level, level 1 first.
READINESS_CRITERIA: dict[str, list[tuple[int, int]]] = {
    "TRL": [(1, 2)] + [(2, 1)] * 8,
    "CRL": [(1, 1)] + [(2, 1)] * 8,
    "FRL": [(1, 1)] + [(2, 1)] * 8,
}


def readiness_key(prefix: str, level: int, kind: str, index: int) -> str:
    return f"{prefix}-{level}-{kind}-{index}"


def all_mandatory_met(answers: dict[str, bool], prefix: str, level: int, mandatory_count: int) -> bool:
    return all(answers.get(readiness_key(prefix, level, "M", index)) is True for index in range(mandatory_count))


def compute_readiness_level(answers: dict[str, bool], prefix: str,
                            criteria: Optional[list[tuple[int, int]]] = None) -> int:
    """The attained level: the highest L where levels 1..L all have their
    mandatory criteria met. Progression stops at the first incomplete level —
    a company cannot skip ahead by answering a later level."""
    rules = criteria or READINESS_CRITERIA.get(prefix, READINESS_CRITERIA["TRL"])
    final_level = 0
    for level in range(1, len(rules) + 1):
        mandatory_count = rules[level - 1][0]
        if all_mandatory_met(answers or {}, prefix, level, mandatory_count):
            final_level = level
        else:
            break
    return final_level


def _compute(inputs: dict[str, Any], ctx: ComputeContext) -> ComputeOutput:
    trl = clamp_int((inputs.get("trl") or {}).get("level"), 0, READINESS_MAX_LEVEL)
    crl = clamp_int((inputs.get("crl") or {}).get("level"), 0, READINESS_MAX_LEVEL)
    frl = clamp_int((inputs.get("frl") or {}).get("level"), 0, READINESS_MAX_LEVEL)
    assessed = {"trl": trl, "crl": crl, "frl": frl}

    # Where the founder filled in the checklists, that is harder evidence than
    # the agent's read of the deck — record both and flag the divergence.
    manual = ctx.bundle.manual
    self_assessment = {
        "trl": compute_readiness_level(manual.trlAnswers, "TRL"),
        "crl": compute_readiness_level(manual.crlAnswers, "CRL"),
        "frl": compute_readiness_level(manual.frlAnswers, "FRL"),
    }
    divergence = [
        f"{key.upper()}: founder self-assessment {self_assessment[key]} vs agent assessment {assessed[key]}"
        for key in ("trl", "crl", "frl")
        if self_assessment[key] > 0 and abs(self_assessment[key] - assessed[key]) >= 2
    ]

    tech_market_gap = trl - crl
    levels = [level for level in (trl, crl, frl) if level > 0]
    score10 = round(sum(levels) / len(levels) / READINESS_MAX_LEVEL * 10, 1) if levels else 0.0

    notes: list[str] = []
    if tech_market_gap >= 3:
        notes.append(f"Technology is {tech_market_gap} levels ahead of commercial readiness — a classic build-first, sell-later gap.")
    if crl - trl >= 3:
        notes.append(f"Commercial readiness is {crl - trl} levels ahead of the technology — demand may outrun what the product can deliver.")
    if frl > 0 and frl < min(trl, crl) - 2:
        notes.append("Funding readiness lags both technology and commercial readiness; the company may be under-capitalised for its stage.")
    notes.extend(divergence)

    return ComputeOutput(
        score10=score10,
        computed={
            "trl": trl, "crl": crl, "frl": frl,
            "maxLevel": READINESS_MAX_LEVEL,
            "techMarketGap": tech_market_gap,
            "founderSelfAssessment": self_assessment,
            "divergenceFromSelfAssessment": divergence,
        },
        confidencePenalty=0.1 * len(divergence),
        notes=notes,
    )


def _gate(profile: StartupProfile, bundle: InputBundle) -> Applicability:
    deep_tech = any(tag in {"deeptech", "hardware", "biotech", "climate", "industrial"} for tag in profile.industries)
    has_manual = bool(bundle.manual.trlAnswers) or bool(bundle.manual.crlAnswers)

    if deep_tech:
        reason = "Deep-tech or hardware company: technology maturity is a first-order investment risk, which is exactly what TRL measures."
    elif has_manual:
        reason = "The founder completed the readiness checklists, so the agent can cross-check its own assessment against them."
    else:
        reason = "Readiness levels give a stage-independent view of whether technology, market and capital are advancing together."

    return Applicability(True, 0.95 if deep_tech else 0.7, reason)


def _dimension(label: str, guidance: str):
    return obj({
        "level": number(f"{label} level, 1-9. {guidance}", 0, 9),
        "levelName": string(f"Short name for that {label} level."),
        "justification": string("Which specific evidence puts the company at this level and not the one above."),
        "blockersToNextLevel": array(string("What is required to reach the next level."), "Concrete blockers."),
    })


SPEC = MethodologySpec(
    id="readiness_levels",
    name="Readiness Levels (TRL / CRL / FRL)",
    family="readiness",
    description="Places the company on the 1-9 Technology, Commercial and Funding Readiness scales and measures the gaps between them.",
    purpose="Shows whether technology, market and capital are advancing together, which is where most deep-tech failures originate.",
    required_inputs=[InputSpec("technology", "Technology description", "What has actually been built and validated.")],
    optional_inputs=[
        InputSpec("traction", "Commercial evidence", "Pilots, LOIs, paying customers."),
        InputSpec("funding", "Funding history", "Capital raised and investor engagement."),
    ],
    output_schema=methodology_schema(obj({
        "trl": _dimension("Technology Readiness", "1 = basic principles observed, 5 = validated in relevant environment, 9 = proven in operational use."),
        "crl": _dimension("Commercial Readiness", "1 = hypothetical market, 5 = validated demand with pilots, 9 = repeatable commercial sales."),
        "frl": _dimension("Funding Readiness", "1 = no funding plan, 5 = credible plan with early investor interest, 9 = fully funded to profitability."),
        "gapAnalysis": string("What the gaps between the three levels mean for this specific company."),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.75,
    limitations=[
        "Level definitions were written for hardware and deep tech; software companies often jump levels in ways the scale does not capture.",
        "Self-reported evidence is easy to over-claim, so an assessed level is an upper bound.",
    ],
    priority=20,
    instruction=(
        "Assess Technology, Commercial and Funding Readiness Levels (1-9) from the evidence available. Justify each level by naming "
        "the specific evidence that puts the company there and what is missing for the next level. Be conservative: absent evidence "
        "of a level's criteria, assign the lower level."
    ),
    compute=_compute,
    gate=_gate,
)
