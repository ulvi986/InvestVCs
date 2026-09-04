"""Risk Factor Summation — adjust a base valuation by twelve risk categories,
each worth +/-$250k per grid step.

The manual calculator in the frontend uses the fixed default base; the agent
may substitute a comparables-derived base, which is what the published method
actually calls for. Any resulting divergence is surfaced by cross-validation
rather than hidden.
"""

from __future__ import annotations

from typing import Any, Optional, Sequence

from ..jsonspec import methodology_schema, number, obj, string
from ..schemas import ComputeOutput, StartupProfile, ValuationRange
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp_int, to_float

RISK_ADJUSTMENT_PER_POINT = 250_000.0
RISK_BASE_VALUATION = 250_000.0

RISK_KEYS = [
    "management", "stage", "legislation", "supply", "sales_marketing",
    "funding", "competition", "technology", "international", "reputation",
    "exit", "political",
]

#: -2 (very high risk) ... +2 (very low risk).
RISK_SCORE_VALUES = [-2, -1, 0, 1, 2]


def compute_risk_factor(scores: Sequence[Optional[float]], base_valuation: float = RISK_BASE_VALUATION) -> float:
    adjustment = sum((score or 0) * RISK_ADJUSTMENT_PER_POINT for score in scores if score is not None)
    return max(0.0, base_valuation + adjustment)


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    factors = inputs.get("factors") or {}
    scores = [clamp_int((factors.get(key) or {}).get("score"), -2, 2) for key in RISK_KEYS]

    supplied_base = to_float(inputs.get("baseValuationUsd"))
    used_default = supplied_base <= 0
    base = RISK_BASE_VALUATION if used_default else round(supplied_base)

    point = compute_risk_factor(scores, base)
    low = compute_risk_factor([max(-2, score - 1) for score in scores], base)
    high = compute_risk_factor([min(2, score + 1) for score in scores], base)

    net_points = sum(scores)

    return ComputeOutput(
        valuation=ValuationRange(low=low, point=point, high=high),
        # Net points span -24..+24; map onto 0..10.
        score10=round((net_points + 24) / 48 * 10, 1),
        computed={
            "scores": dict(zip(RISK_KEYS, scores)),
            "netRiskPoints": net_points,
            "totalAdjustmentUsd": net_points * RISK_ADJUSTMENT_PER_POINT,
            "baseValuationUsd": base,
            "usedDefaultBase": used_default,
            "criticalRiskCount": len([score for score in scores if score <= -2]),
            "bandBasis": "each risk category stepped ±1 grid position",
        },
        confidencePenalty=0.15 if used_default else 0.0,
        notes=(
            [f"No comparables-derived base was available, so the platform default of ${RISK_BASE_VALUATION:,.0f} was used. "
             "The absolute level is therefore weak; the relative risk profile is the signal."]
            if used_default else []
        ),
    )


def _gate(profile: StartupProfile, _bundle) -> Applicability:
    if profile.stage == "growth":
        return Applicability(False, 0.2, "Fixed $250k steps are immaterial at growth-stage valuations.")
    return Applicability(True, 0.8, "Early-stage company where the risk profile, not the projections, drives what an investor will pay.")


def _risk(label: str, question: str):
    return obj({
        "score": number(f"−2 (very high risk) to +2 (very low risk). {question}", -2, 2),
        "justification": string(f"Evidence for this {label} risk assessment."),
    })


SPEC = MethodologySpec(
    id="risk_factor",
    name="Risk Factor Summation",
    family="valuation",
    description="Adjusts a base valuation up or down by $250k per grid step across twelve standard venture risk categories.",
    purpose="Prices the specific risks of this company rather than its upside, giving a risk-weighted counterpoint to optimistic methods.",
    required_inputs=[
        InputSpec("base", "Base valuation", "Median pre-money for comparable companies."),
        InputSpec("risks", "Risk profile", "Evidence across the twelve risk categories."),
    ],
    optional_inputs=[InputSpec("financials", "Financial position", "Runway and burn inform funding risk.")],
    output_schema=methodology_schema(obj({
        "baseValuationUsd": number("Base pre-money valuation (USD) for a comparable company with average risk. Use 0 if you have no credible basis."),
        "baseBasis": string("How you derived the base, or why you could not."),
        "factors": obj({
            "management": _risk("management", "Quality and completeness of the management team."),
            "stage": _risk("stage of business", "How far the business has progressed."),
            "legislation": _risk("legislative/political", "Regulatory exposure."),
            "supply": _risk("manufacturing/supply chain", "Production and supply dependencies."),
            "sales_marketing": _risk("sales and marketing", "Go-to-market risk."),
            "funding": _risk("funding/capital raising", "Ability to raise the capital the plan requires."),
            "competition": _risk("competition", "Competitive pressure and threat of entrants."),
            "technology": _risk("technology", "Technical feasibility and obsolescence risk."),
            "international": _risk("international", "Cross-border operational risk."),
            "reputation": _risk("reputation", "Brand and reputational exposure."),
            "exit": _risk("potential lucrative exit", "Realistic exit paths and acquirer appetite."),
            "political": _risk("political", "Macro-political exposure in the operating geography."),
        }),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a"],
    base_confidence=0.68,
    limitations=[
        "The ±$250k step is a convention, not an empirical figure, and does not scale with company size.",
        "Twelve categories are weighted equally, which overweights minor risks and underweights fatal ones.",
        "Only as good as its base valuation; with no comparables the absolute number is close to meaningless.",
    ],
    priority=25,
    instruction=(
        "Score each of the twelve venture risk categories from −2 (very high risk) to +2 (very low risk) on the evidence available. "
        "Where a category is simply unevidenced, score it 0 and list it in missingInputs — do not reward a company for risks you could "
        "not check. Also supply a base pre-money valuation for an average-risk comparable, or 0 if you have no credible basis. "
        "Do NOT compute the valuation yourself."
    ),
    compute=_compute,
    gate=_gate,
)
