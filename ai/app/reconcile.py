"""Cross-validation and valuation reconciliation.

The rule this module exists to enforce: when methodologies disagree, do not
average them. Averaging destroys the single most useful signal in the whole
analysis — that two defensible methods, applied to the same company, produce
different answers, and the reason why is what an investor needs to know.

Division of labour: this file detects and quantifies disagreement
deterministically; the critic agent explains it and may reweight; then
`finalise` produces the range with that explanation attached.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from typing import Any, Optional

from . import registry
from .schemas import (
    Disagreement, DisagreementValue, ExclusionEntry, MethodologyResult,
    ReconciledValuation, ValuationRange, WeightEntry,
)


@dataclass
class WeightedValuation:
    methodology_id: str
    name: str
    valuation: ValuationRange
    #: Registry base confidence x the agent's confidence in this run.
    weight: float
    confidence: float
    is_outlier: bool = False
    outlier_reason: str = ""
    rationale: str = "Registry base confidence × the agent's confidence in this run."


@dataclass
class ValuationSpread:
    entries: list[WeightedValuation] = field(default_factory=list)
    included: list[WeightedValuation] = field(default_factory=list)
    outliers: list[WeightedValuation] = field(default_factory=list)
    spread_ratio: float = 1.0
    agreement: float = 0.0
    provisional: Optional[ValuationRange] = None
    median_usd: float = 0.0


def _weighted_geometric_mean(pairs: list[tuple[float, float]]) -> float:
    usable = [(value, weight) for value, weight in pairs if value > 0 and weight > 0]
    if not usable:
        return 0.0
    total_weight = sum(weight for _, weight in usable)
    log_sum = sum(weight * math.log(value) for value, weight in usable)
    return math.exp(log_sum / total_weight)


def analyse_valuation_spread(results: dict[str, MethodologyResult]) -> ValuationSpread:
    """Spread across the valuation methodologies that actually completed.

    Outliers are found on a log scale, because valuations are multiplicative:
    $1M vs $4M is the same disagreement as $10M vs $40M. A method more than a
    factor of ~2.7 from the log-median is flagged — flagged, not deleted; it
    still widens the reported range and is named in the report.
    """
    entries: list[WeightedValuation] = []
    for result in results.values():
        spec = registry.get(result.methodologyId)
        if spec is None or spec.family != "valuation":
            continue
        if result.status != "completed" or result.valuation is None or result.valuation.point <= 0:
            continue
        confidence = min(1.0, max(0.0, result.confidence or 0.0))
        entries.append(WeightedValuation(
            methodology_id=result.methodologyId,
            name=result.name,
            valuation=result.valuation,
            confidence=confidence,
            weight=max(0.01, spec.base_confidence * confidence),
        ))

    if not entries:
        return ValuationSpread()

    points = [entry.valuation.point for entry in entries]
    log_median = statistics.median([math.log(point) for point in points])

    if len(entries) >= 3:
        deviations = [abs(math.log(point) - log_median) for point in points]
        mad = statistics.median(deviations)
        # 1.0 in log space is a factor of e. Below that floor, a tight cluster
        # would flag a perfectly reasonable member as an outlier.
        threshold = max(1.0, mad * 2.5)
        for entry, deviation, point in zip(entries, deviations, points):
            if deviation > threshold:
                entry.is_outlier = True
                factor = math.exp(abs(math.log(point) - log_median))
                entry.outlier_reason = f"{factor:.1f}× away from the median of the other methods."

    included = [entry for entry in entries if not entry.is_outlier]
    outliers = [entry for entry in entries if entry.is_outlier]
    basis = included or entries

    point = round(_weighted_geometric_mean([(entry.valuation.point, entry.weight) for entry in basis]))
    low = round(min(entry.valuation.low for entry in basis))
    high = round(max(entry.valuation.high for entry in basis))

    max_point, min_point = max(points), min(points)
    spread_ratio = round(max_point / min_point, 2) if min_point > 0 else float("inf")

    # 1x spread is perfect agreement; 10x is none.
    agreement = (
        round(min(1.0, max(0.0, 1 - math.log10(max(1.0, spread_ratio)))), 2)
        if math.isfinite(spread_ratio) else 0.0
    )

    return ValuationSpread(
        entries=entries,
        included=included,
        outliers=outliers,
        spread_ratio=spread_ratio,
        agreement=agreement,
        provisional=ValuationRange(low=max(0, low), point=point, high=max(point, high)),
        median_usd=round(math.exp(log_median)),
    )


def _severity_for_spread(ratio: float) -> str:
    if ratio >= 5:
        return "critical"
    if ratio >= 3:
        return "high"
    if ratio >= 1.75:
        return "medium"
    return "low"


def detect_disagreements(results: dict[str, MethodologyResult], spread: ValuationSpread) -> list[Disagreement]:
    """Structural cross-checks that do not need a model. Each one is a place
    where two methodologies looked at the same company and reached incompatible
    conclusions; the critic is asked to explain the ones found here."""
    found: list[Disagreement] = []

    if len(spread.entries) >= 2 and spread.spread_ratio > 1.5:
        found.append(Disagreement(
            id="valuation-spread",
            topic="Valuation",
            parties=[entry.methodology_id for entry in spread.entries],
            values=[
                DisagreementValue(methodologyId=entry.methodology_id, label=entry.name, value=entry.valuation.point)
                for entry in spread.entries
            ],
            spreadRatio=spread.spread_ratio,
            severity=_severity_for_spread(spread.spread_ratio),
        ))

    def score_of(methodology_id: str) -> Optional[float]:
        result = results.get(methodology_id)
        if not result or result.status != "completed" or result.score10 is None:
            return None
        return result.score10

    market = score_of("market_analysis")
    competitive = score_of("competitive_analysis")
    if market is not None and competitive is not None and market - competitive >= 3:
        found.append(Disagreement(
            id="market-vs-defensibility",
            topic="Attractive market, weak defensibility",
            parties=["market_analysis", "competitive_analysis"],
            values=[
                DisagreementValue(methodologyId="market_analysis", label="Market attractiveness", value=market),
                DisagreementValue(methodologyId="competitive_analysis", label="Competitive defensibility", value=competitive),
            ],
            spreadRatio=round(market / max(0.1, competitive), 2),
            severity="high" if market - competitive >= 5 else "medium",
        ))

    readiness = results.get("readiness_levels")
    if readiness and readiness.status == "completed":
        gap = float(readiness.computed.get("techMarketGap") or 0)
        if abs(gap) >= 3:
            found.append(Disagreement(
                id="trl-crl-gap",
                topic="Technology and commercial readiness are out of step",
                parties=["readiness_levels"],
                values=[
                    DisagreementValue(methodologyId="readiness_levels", label="TRL", value=float(readiness.computed.get("trl") or 0)),
                    DisagreementValue(methodologyId="readiness_levels", label="CRL", value=float(readiness.computed.get("crl") or 0)),
                ],
                spreadRatio=abs(gap),
                severity="high" if abs(gap) >= 5 else "medium",
            ))

    financial = score_of("financial_analysis")
    if financial is not None and financial <= 3 and spread.provisional and spread.provisional.point > 2_000_000:
        found.append(Disagreement(
            id="valuation-vs-financial-health",
            topic="Valuation is not supported by the financial position",
            parties=["financial_analysis"] + [entry.methodology_id for entry in spread.included],
            values=[
                DisagreementValue(methodologyId="financial_analysis", label="Financial health (0-10)", value=financial),
                DisagreementValue(methodologyId="reconciled", label="Provisional valuation (USD)", value=spread.provisional.point),
            ],
            spreadRatio=0,
            severity="high",
        ))

    traction = score_of("team_traction")
    if traction is not None and traction <= 3 and market is not None and market >= 8:
        found.append(Disagreement(
            id="market-vs-traction",
            topic="Large claimed market, little demonstrated demand",
            parties=["market_analysis", "team_traction"],
            values=[
                DisagreementValue(methodologyId="market_analysis", label="Market attractiveness", value=market),
                DisagreementValue(methodologyId="team_traction", label="Traction quality", value=traction),
            ],
            spreadRatio=round(market / max(0.1, traction), 2),
            severity="medium",
        ))

    return found


def finalise(spread: ValuationSpread, critic: Optional[dict[str, Any]]) -> ReconciledValuation:
    """Apply the critic's judgement to the computed spread. Every adjustment is
    recorded so the reader can see what was done and why."""
    critic = critic or {}

    excluded: list[ExclusionEntry] = [
        ExclusionEntry(methodologyId=entry.methodology_id, reason=entry.outlier_reason or "Statistical outlier.")
        for entry in spread.outliers
    ]

    critic_exclusions = {
        str(item.get("methodologyId")): str(item.get("reason") or "Excluded by the critic.")
        for item in (critic.get("exclude") or []) if isinstance(item, dict) and item.get("methodologyId")
    }
    multipliers = {
        str(item.get("methodologyId")): item
        for item in (critic.get("reweight") or []) if isinstance(item, dict) and item.get("methodologyId")
    }

    basis: list[WeightedValuation] = []
    for entry in spread.entries:
        if entry.is_outlier:
            continue
        reason = critic_exclusions.get(entry.methodology_id)
        if reason:
            excluded.append(ExclusionEntry(methodologyId=entry.methodology_id, reason=reason))
            continue

        adjustment = multipliers.get(entry.methodology_id)
        multiplier = 1.0
        rationale = entry.rationale
        if adjustment:
            try:
                multiplier = min(3.0, max(0.1, float(adjustment.get("multiplier", 1))))
            except (TypeError, ValueError):
                multiplier = 1.0
            rationale = str(adjustment.get("rationale") or rationale)

        basis.append(WeightedValuation(
            methodology_id=entry.methodology_id, name=entry.name, valuation=entry.valuation,
            weight=entry.weight * multiplier, confidence=entry.confidence, rationale=rationale,
        ))

    if not basis:
        basis = [
            WeightedValuation(
                methodology_id=entry.methodology_id, name=entry.name, valuation=entry.valuation,
                weight=entry.weight, confidence=entry.confidence, rationale="Only remaining estimate.",
            )
            for entry in spread.entries
        ]

    override = critic.get("overrideRange") if isinstance(critic.get("overrideRange"), dict) else None

    if not basis:
        value_range = ValuationRange()
        method = "No valuation methodology produced a usable estimate."
    elif override and float(override.get("point") or 0) > 0:
        point = round(float(override.get("point")))
        value_range = ValuationRange(
            low=max(0.0, round(float(override.get("low") or 0))),
            point=point,
            high=max(point, round(float(override.get("high") or 0))),
        )
        method = f"Critic-adjusted range: {override.get('rationale', '')}"
    else:
        point = round(_weighted_geometric_mean([(entry.valuation.point, entry.weight) for entry in basis]))
        value_range = ValuationRange(
            low=max(0.0, round(min(entry.valuation.low for entry in basis))),
            point=point,
            high=max(point, round(max(entry.valuation.high for entry in basis))),
        )
        method = (
            "Confidence-weighted geometric mean of the methodologies that survived cross-validation, with the range "
            "spanning their combined low and high bounds. Geometric rather than arithmetic because valuation "
            "disagreements are multiplicative, and weighted rather than averaged so a low-confidence method cannot "
            "drag the estimate."
        )

    total_weight = sum(entry.weight for entry in basis) or 1.0
    weighted_confidence = sum(entry.confidence * entry.weight for entry in basis) / total_weight

    # Wide disagreement means low confidence in the reconciled number, however
    # confident each individual method was in itself.
    confidence = round(min(1.0, max(0.0, weighted_confidence * (0.5 + 0.5 * spread.agreement))), 2)

    return ReconciledValuation(
        range=value_range,
        method=method,
        weights=[
            WeightEntry(
                methodologyId=entry.methodology_id,
                weight=round(entry.weight / total_weight, 3),
                rationale=entry.rationale,
            )
            for entry in basis
        ],
        excluded=excluded,
        spreadRatio=spread.spread_ratio if math.isfinite(spread.spread_ratio) else 0,
        agreement=spread.agreement,
        confidence=confidence,
        explanation=str(critic.get("explanation") or "").strip(),
        keyAssumptions=[str(item) for item in (critic.get("keyAssumptions") or []) if str(item).strip()],
    )
