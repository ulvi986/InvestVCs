"""Financial analysis — deterministic health scoring over the founder's
financial snapshot, plus an agent that interprets it."""

from __future__ import annotations

from typing import Any, Optional

from ..jsonspec import array, methodology_schema, number, obj, string
from ..schemas import ComputeOutput, InputBundle, StartupProfile
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp, finite_or_none

_HEALTH_CHECKS = ["revenue", "expenses", "runway", "churn", "grossMargin", "cac", "cltv"]


def _get(snapshot: Optional[dict[str, Any]], *path: str) -> Any:
    node: Any = snapshot or {}
    for key in path:
        if not isinstance(node, dict):
            return None
        node = node.get(key)
    return node


def compute_financial_health_score(snapshot: Optional[dict[str, Any]]) -> int:
    """0-100 financial health. Profitability 30, runway 25, churn 20, gross
    margin 25. Components with no data score 0 rather than a default, so an
    empty snapshot cannot look healthy."""
    if not snapshot:
        return 0

    revenue = finite_or_none(_get(snapshot, "revenue", "total")) or 0.0
    expenses = finite_or_none(_get(snapshot, "expenses", "total")) or 0.0
    runway = finite_or_none(_get(snapshot, "cashFlow", "runway"))
    churn = finite_or_none(_get(snapshot, "customerMetrics", "churnRate"))
    margin = finite_or_none(_get(snapshot, "customerMetrics", "grossMargin"))

    score = 0
    if revenue > expenses:
        score += 30
    elif revenue > 0:
        score += 15

    if runway is not None:
        if runway > 12:
            score += 25
        elif runway > 6:
            score += 15
        elif runway > 0:
            score += 5

    if churn is not None:
        if churn < 0.05:
            score += 20
        elif churn < 0.1:
            score += 10

    if margin is not None:
        if margin > 0.6:
            score += 25
        elif margin > 0.3:
            score += 15
        elif margin > 0:
            score += 5

    return min(score, 100)


def financial_coverage(snapshot: Optional[dict[str, Any]]) -> dict[str, Any]:
    present = []
    if finite_or_none(_get(snapshot, "revenue", "total")) is not None:
        present.append("revenue")
    if finite_or_none(_get(snapshot, "expenses", "total")) is not None:
        present.append("expenses")
    if finite_or_none(_get(snapshot, "cashFlow", "runway")) is not None:
        present.append("runway")
    if finite_or_none(_get(snapshot, "customerMetrics", "churnRate")) is not None:
        present.append("churn")
    if finite_or_none(_get(snapshot, "customerMetrics", "grossMargin")) is not None:
        present.append("grossMargin")
    if finite_or_none(_get(snapshot, "customerMetrics", "cac")) is not None:
        present.append("cac")
    if finite_or_none(_get(snapshot, "customerMetrics", "cltv")) is not None:
        present.append("cltv")

    missing = [key for key in _HEALTH_CHECKS if key not in present]
    return {"present": present, "missing": missing, "ratio": len(present) / len(_HEALTH_CHECKS)}


def _compute(inputs: dict[str, Any], ctx: ComputeContext) -> ComputeOutput:
    snapshot = ctx.bundle.financialSnapshot
    deterministic = compute_financial_health_score(snapshot)
    coverage = financial_coverage(snapshot)
    agent_score = clamp(inputs.get("healthScore10"), 0, 10, 0)

    # With a real snapshot the deterministic score anchors the agent's read;
    # with no snapshot the agent's judgement is all there is.
    score10 = round(deterministic / 10 * 0.6 + agent_score * 0.4, 1) if snapshot else round(agent_score, 1)

    cltv = finite_or_none(_get(snapshot, "customerMetrics", "cltv"))
    cac = finite_or_none(_get(snapshot, "customerMetrics", "cac"))
    ltv_cac = round(cltv / cac, 2) if cltv is not None and cac not in (None, 0) else None

    notes: list[str] = []
    if ltv_cac is not None and ltv_cac < 3:
        notes.append(f"LTV/CAC of {ltv_cac} is below the 3.0 threshold investors normally require for a repeatable acquisition motion.")
    runway = finite_or_none(_get(snapshot, "cashFlow", "runway"))
    if runway is not None and 0 < runway < 6:
        notes.append(f"Runway of {runway:.1f} months leaves no room to negotiate — this is a financing-risk item, not just a metric.")
    if not snapshot:
        notes.append("No financial snapshot was supplied, so this section rests entirely on narrative claims.")

    return ComputeOutput(
        score10=score10,
        computed={
            "deterministicHealthScore100": deterministic,
            "agentHealthScore10": agent_score,
            "ltvCacRatio": ltv_cac,
            "coveragePresent": coverage["present"],
            "coverageMissing": coverage["missing"],
            "coverageRatio": round(coverage["ratio"], 2),
            "snapshotPresent": bool(snapshot),
        },
        confidencePenalty=(1 - coverage["ratio"]) * 0.4 if snapshot else 0.45,
        notes=notes,
    )


def _gate(profile: StartupProfile, bundle: InputBundle) -> Applicability:
    has_snapshot = bundle.financialSnapshot is not None
    has_narrative = profile.financials.monthlyBurnUsd is not None or profile.financials.runwayMonths is not None

    if not has_snapshot and not has_narrative and profile.stage == "idea":
        return Applicability(False, 0.15, "No financial data of any kind at idea stage — there is nothing to analyse.")

    return Applicability(
        True, 0.95 if has_snapshot else 0.5,
        "A financial snapshot is on file, so runway, burn and unit economics can be assessed against real figures."
        if has_snapshot else
        "Only narrative financials are available; the analysis will run but with an explicit confidence penalty.",
    )


SPEC = MethodologySpec(
    id="financial_analysis",
    name="Financial Analysis",
    family="financial",
    description="Assesses runway, burn, margin, churn and unit economics against stage-appropriate norms.",
    purpose="Establishes whether the company can survive long enough to prove its thesis, and whether the economics work at scale.",
    required_inputs=[InputSpec("snapshot", "Financial snapshot", "Revenue, expenses, cash, customer metrics.")],
    optional_inputs=[
        InputSpec("history", "Financial history", "Multiple snapshots showing a trend."),
        InputSpec("fundraising", "Raise plan", "Amount sought and use of funds."),
    ],
    output_schema=methodology_schema(obj({
        "healthScore10": number("0-10 financial health, judged against norms for this stage and sector.", 0, 10),
        "runwayAssessment": string("Is the runway adequate for what the company says it will achieve? Reference the actual figure."),
        "burnAssessment": string("Is the burn proportionate to the stage and the progress it bought?"),
        "marginAssessment": string("Are gross margins consistent with the stated business model?"),
        "unitEconomics": string("CAC, LTV, payback — state plainly where the data does not exist."),
        "churnAssessment": string("Retention quality, or why it cannot be judged."),
        "benchmarks": array(string("A benchmark you compared against, marked as a rule of thumb where it is one."), "Benchmarks used."),
        "redFlags": array(string("A financial red flag."), "Anything an investor would stop on."),
    })),
    applicable_stages=["pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.8,
    limitations=[
        "Self-reported and unaudited; nothing here is verified against bank or accounting records.",
        "A single snapshot cannot show a trend — direction of travel matters more than the level.",
    ],
    priority=20,
    instruction=(
        "Assess the company's financial position against norms for its stage and sector. Reference the actual figures supplied. "
        "Where a metric is missing, say so explicitly and list it in missingInputs rather than estimating it. "
        "Do not describe a position as healthy if the underlying data is absent."
    ),
    compute=_compute,
    gate=_gate,
)
