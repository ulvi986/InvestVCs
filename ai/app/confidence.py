"""Confidence and evidence-quality scoring.

Confidence is computed, not asserted. An agent's self-reported confidence is
only one input; it is capped by the registry's base confidence for the
methodology, reduced by missing inputs and by how much of the evidence is the
model's own inference, and finally capped again by the critic.
"""

from __future__ import annotations

from typing import Optional, Sequence

from .methodologies.base import MethodologySpec
from .schemas import (
    AnalysisPlan, ConfidenceReport, Critique, Evidence, MethodologyResult,
)

#: How much a claim is worth, by where it came from.
SOURCE_WEIGHT: dict[str, float] = {
    "provided": 1.0,
    "derived": 0.9,
    "inferred": 0.4,
    "absent": 0.0,
}


def evidence_quality(evidence: Optional[Sequence[Evidence]]) -> float:
    """0..1 quality of an evidence set. An empty set scores 0 — silence is not
    the same as certainty."""
    if not evidence:
        return 0.0
    total = 0.0
    for item in evidence:
        weight = SOURCE_WEIGHT.get(item.sourceType, 0.4)
        claim_confidence = min(1.0, max(0.0, item.confidence if item.confidence is not None else 0.5))
        total += weight * claim_confidence
    return round(total / len(evidence), 2)


def inference_share(evidence: Optional[Sequence[Evidence]]) -> float:
    """Share of evidence that is the model's own inference rather than data."""
    if not evidence:
        return 1.0
    inferred = len([item for item in evidence if item.sourceType in ("inferred", "absent")])
    return round(inferred / len(evidence), 2)


def methodology_confidence(
    *,
    spec: MethodologySpec,
    agent_confidence: float,
    evidence: Sequence[Evidence],
    missing_input_count: int,
    compute_penalty: float,
) -> float:
    """Final confidence for one methodology run. The registry base confidence
    is a hard ceiling: no amount of model self-assurance can make Berkus more
    reliable than Berkus is."""
    self_reported = min(1.0, max(0.0, agent_confidence or 0.0))
    quality = evidence_quality(evidence)

    # Blend the agent's own confidence with what the evidence actually
    # supports, weighting the evidence more heavily — it cannot inflate that.
    blended = self_reported * 0.4 + quality * 0.6

    missing_penalty = min(0.4, missing_input_count * 0.06)
    penalty = min(0.7, missing_penalty + max(0.0, compute_penalty or 0.0))

    return round(min(spec.base_confidence, max(0.0, blended - penalty)), 2)


def overall_confidence(
    *,
    results: dict[str, MethodologyResult],
    plan: Optional[AnalysisPlan],
    critique: Optional[Critique],
    profile_evidence_quality: float,
    reconciled_confidence: Optional[float],
) -> ConfidenceReport:
    """Overall confidence plus the plain-language drivers and caveats shown
    alongside it. Never returns a bare number without its reasons."""
    planned = [entry for entry in (plan.entries if plan else []) if entry.selected]
    completed = [result for result in results.values() if result.status == "completed"]
    failed = [result for result in results.values() if result.status in ("failed", "insufficient_input")]

    coverage = round(len(completed) / len(planned), 2) if planned else 0.0

    all_evidence: list[Evidence] = [item for result in completed for item in result.evidence]
    evidence_score = (
        round((evidence_quality(all_evidence) + profile_evidence_quality) / 2, 2)
        if all_evidence else round(profile_evidence_quality, 2)
    )

    mean_method_confidence = (
        sum(result.confidence for result in completed) / len(completed) if completed else 0.0
    )

    base = (
        mean_method_confidence * 0.4
        + evidence_score * 0.3
        + coverage * 0.2
        + (reconciled_confidence if reconciled_confidence is not None else mean_method_confidence) * 0.1
    )

    ceiling = 1.0
    if critique is not None and critique.confidenceCeiling is not None:
        ceiling = min(1.0, max(0.0, critique.confidenceCeiling))

    overall = round(min(ceiling, max(0.0, base)), 2)

    drivers: list[str] = []
    caveats: list[str] = []

    if coverage >= 0.9:
        drivers.append(f"{len(completed)} of {len(planned)} planned methodologies completed.")
    else:
        caveats.append(f"Only {len(completed)} of {len(planned)} planned methodologies completed, so the analysis is incomplete.")

    if evidence_score >= 0.7:
        drivers.append(f"Evidence quality {evidence_score:.2f}: most claims trace to data the founder provided.")
    else:
        caveats.append(
            f"Evidence quality {evidence_score:.2f}: a substantial share of the analysis rests on inference rather than provided data."
        )

    if reconciled_confidence is not None:
        if reconciled_confidence >= 0.6:
            drivers.append(f"Valuation methodologies broadly agree (reconciliation confidence {reconciled_confidence:.2f}).")
        else:
            caveats.append(f"Valuation methodologies disagree materially (reconciliation confidence {reconciled_confidence:.2f}).")

    for result in failed:
        caveats.append(f"{result.name} did not complete: {result.error or 'insufficient input'}.")

    if critique is not None and ceiling < 1:
        caveats.append(
            f"The critic capped confidence at {ceiling:.2f}: {critique.summary or 'unresolved issues in the analysis.'}"
        )

    if critique is not None:
        for flag in critique.redFlags:
            if flag.severity == "critical":
                caveats.append(f"Critical red flag: {flag.title}.")

    return ConfidenceReport(
        overall=overall,
        evidenceQuality=evidence_score,
        coverage=coverage,
        drivers=drivers,
        caveats=caveats,
    )
