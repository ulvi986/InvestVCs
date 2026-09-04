"""Dedicated risk analysis.

Distinct from Risk Factor Summation: that one converts risk into a valuation
adjustment, this one enumerates what could actually kill the company and what
evidence is missing to judge it.
"""

from __future__ import annotations

from typing import Any

from ..jsonspec import array, enum, methodology_schema, number, obj, string
from ..schemas import ComputeOutput
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp

SEVERITY_WEIGHT = {"low": 1, "medium": 2, "high": 4, "critical": 8}


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    raw_risks = inputs.get("risks")
    risks = raw_risks if isinstance(raw_risks, list) else []

    exposure = sum(
        SEVERITY_WEIGHT.get(str((risk or {}).get("severity")), 1) * clamp((risk or {}).get("likelihood"), 0, 1, 0)
        for risk in risks
    )
    critical = [risk for risk in risks if str((risk or {}).get("severity")) == "critical"]
    high = [risk for risk in risks if str((risk or {}).get("severity")) == "high"]

    # Exposure 0 -> 10/10; exposure 20+ -> 0/10. No risks listed at all is
    # treated as unanalysed, not as safe.
    score10 = 0.0 if not risks else round(max(0.0, 10 - exposure / 2), 1)

    by_category: dict[str, int] = {}
    for risk in risks:
        key = str((risk or {}).get("category") or "uncategorised")
        by_category[key] = by_category.get(key, 0) + 1

    notes: list[str] = []
    if not risks:
        notes.append("The risk agent returned no risks. That is treated as a failure to analyse, not as an absence of risk.")
    if critical:
        notes.append(f"{len(critical)} risk(s) rated critical — each is capable of ending the company on its own.")

    return ComputeOutput(
        score10=score10,
        computed={
            "riskCount": len(risks),
            "criticalCount": len(critical),
            "highCount": len(high),
            "exposureIndex": round(exposure, 2),
            "byCategory": by_category,
            "killRisks": [str((risk or {}).get("title")) for risk in critical if (risk or {}).get("title")],
        },
        confidencePenalty=0.3 if not risks else 0.0,
        notes=notes,
    )


SPEC = MethodologySpec(
    id="risk_analysis",
    name="Risk Analysis",
    family="risk",
    description="Enumerates what could kill the company, how likely each is, and what evidence is missing to judge it.",
    purpose="Forces the failure modes into the open rather than leaving them implicit in a valuation discount.",
    required_inputs=[InputSpec("profile", "Startup profile", "The full understanding of the company.")],
    optional_inputs=[
        InputSpec("financials", "Financials", "Runway drives financing risk."),
        InputSpec("technology", "Technology", "Technical risk."),
    ],
    output_schema=methodology_schema(obj({
        "risks": array(
            obj({
                "category": enum(
                    ["market", "technology", "team", "financial", "regulatory", "competitive", "operational", "legal", "concentration"],
                    "Risk category.",
                ),
                "title": string("Short risk title."),
                "description": string("What goes wrong, through what mechanism, and what it costs the investor."),
                "severity": enum(["low", "medium", "high", "critical"], "critical = capable of ending the company."),
                "likelihood": number("0..1 probability of materialising within the investment horizon.", 0, 1),
                "mitigation": string("What would materially reduce this risk."),
                "evidence": array(string("Evidence that this risk is real, not hypothetical."), "Supporting evidence."),
            }),
            "Every material risk. Rank by severity x likelihood, most serious first.",
        ),
        "killRisk": string("The single risk most likely to end this company, and why."),
        "unknowns": array(string("Something an investor would need to diligence before committing."), "What cannot be judged from the material available."),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.75,
    limitations=[
        "Only surfaces risks visible in the material provided; a deck rarely volunteers its own worst risk.",
        "Likelihoods are judgement calls, not calibrated probabilities.",
    ],
    priority=40,
    instruction=(
        "Enumerate the risks that would actually change an investment decision, each with severity, likelihood, mitigation and "
        "supporting evidence. Include the risks the deck avoids. Then name the single most likely cause of failure. "
        "Returning no risks is not an acceptable answer."
    ),
    compute=_compute,
    gate=lambda _profile, _bundle: Applicability(True, 1.0, "Risk enumeration is mandatory for any investment recommendation."),
)
