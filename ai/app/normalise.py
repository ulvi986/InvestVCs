"""Coercion layer between raw agent output and the typed domain model.

Nothing downstream of this file trusts the model's output shape. A missing
array, a stringified number or an invented enum value degrades the result — it
never raises in the middle of an analysis the user is watching.
"""

from __future__ import annotations

import itertools
import re
import uuid
from typing import Any, Callable, Iterable, Optional, Sequence, TypeVar

from .confidence import evidence_quality
from .schemas import (
    Contradiction, CredibilityCheck, Critique, Evidence, Gap, RedFlag,
    RECOMMENDATIONS, Risk, Scenario, ScoredSection, STARTUP_STAGES, StartupProfile,
    UnsupportedAssumption, INDUSTRY_TAGS, RerunRequest,
)

T = TypeVar("T")

_counter = itertools.count()
_NUMERIC = re.compile(r"[^0-9.eE+-]")


def uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}-{next(_counter)}"


def text(value: Any, fallback: str = "") -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, bool)):
        return str(value)
    return fallback


def number(value: Any, fallback: float = 0.0) -> float:
    if isinstance(value, bool):
        return fallback
    if isinstance(value, (int, float)):
        result = float(value)
        return result if result == result and abs(result) != float("inf") else fallback
    if isinstance(value, str):
        # Models sometimes return "$1,200,000" or "12%" despite the schema.
        cleaned = _NUMERIC.sub("", value)
        try:
            result = float(cleaned)
            return result if result == result and abs(result) != float("inf") else fallback
        except ValueError:
            return fallback
    return fallback


def number_or_none(value: Any) -> Optional[float]:
    """Zero means "not stated" throughout the agent schemas; map it to None."""
    result = number(value, 0.0)
    return None if result == 0 else result


def clamp(value: Any, low: float, high: float, fallback: float) -> float:
    return min(high, max(low, number(value, fallback)))


def strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in (text(entry) for entry in value) if item]


def each(value: Any, mapper: Callable[[Any], Optional[T]]) -> list[T]:
    if not isinstance(value, list):
        return []
    return [item for item in (mapper(entry) for entry in value) if item is not None]


def pick(value: Any, allowed: Sequence[str], fallback: str) -> str:
    raw = text(value).lower().replace("-", "_").replace(" ", "_")
    return raw if raw in allowed else fallback


def as_severity(value: Any) -> str:
    return pick(value, ["low", "medium", "high", "critical"], "medium")


def as_source_type(value: Any) -> str:
    return pick(value, ["provided", "derived", "inferred", "absent"], "inferred")


def as_stage(value: Any) -> str:
    return pick(value, STARTUP_STAGES, "pre_seed")


def as_recommendation(value: Any) -> str:
    return pick(value, RECOMMENDATIONS, "consider")


def normalise_evidence(value: Any, methodology: str) -> list[Evidence]:
    def build(entry: Any) -> Optional[Evidence]:
        if not isinstance(entry, dict):
            return None
        claim = text(entry.get("claim"))
        if not claim:
            return None
        return Evidence(
            id=uid("ev"),
            claim=claim,
            evidence=text(entry.get("evidence"), "No evidence cited."),
            source=text(entry.get("source"), "unspecified"),
            sourceType=as_source_type(entry.get("sourceType")),
            confidence=clamp(entry.get("confidence"), 0, 1, 0.5),
            methodology=methodology,
            reasoning=text(entry.get("reasoning")),
        )

    return each(value, build)


def normalise_risks(value: Any, source: str) -> list[Risk]:
    def build(entry: Any) -> Optional[Risk]:
        if not isinstance(entry, dict):
            return None
        title = text(entry.get("title"))
        if not title:
            return None
        return Risk(
            id=uid("risk"),
            category=text(entry.get("category"), "general"),
            title=title,
            description=text(entry.get("description")),
            severity=as_severity(entry.get("severity")),
            likelihood=clamp(entry.get("likelihood"), 0, 1, 0.5),
            mitigation=text(entry.get("mitigation")),
            evidence=strings(entry.get("evidence")),
            source=source,
        )

    return each(value, build)


def normalise_gaps(value: Any) -> list[Gap]:
    def build(entry: Any) -> Optional[Gap]:
        if not isinstance(entry, dict):
            return None
        field_name = text(entry.get("field"))
        if not field_name:
            return None
        return Gap(
            field=field_name,
            why=text(entry.get("why")),
            blocks=strings(entry.get("blocks")),
            question=text(entry.get("question"), f"What is the {field_name}?"),
        )

    return each(value, build)


def _industries(value: Any) -> list[str]:
    tags = [
        tag for tag in (item.lower().replace("-", "_").replace(" ", "_") for item in strings(value))
        if tag in INDUSTRY_TAGS
    ]
    return list(dict.fromkeys(tags))[:3] or ["other"]


def _section(raw: Any, key: str) -> dict[str, Any]:
    node = (raw or {}).get(key) if isinstance(raw, dict) else None
    return node if isinstance(node, dict) else {}


def normalise_profile(raw: Any, fallback_name: str = "") -> StartupProfile:
    raw = raw if isinstance(raw, dict) else {}
    evidence = normalise_evidence(raw.get("evidence"), "understand")

    business = _section(raw, "businessModel")
    market = _section(raw, "market")
    product = _section(raw, "product")
    technology = _section(raw, "technology")
    team = _section(raw, "team")
    traction = _section(raw, "traction")
    competition = _section(raw, "competition")
    financials = _section(raw, "financials")
    fundraising = _section(raw, "fundraising")

    return StartupProfile(
        name=text(raw.get("name")) or fallback_name or "Unnamed startup",
        oneLiner=text(raw.get("oneLiner"), "Not stated in the supplied material."),
        stage=as_stage(raw.get("stage")),
        stageRationale=text(raw.get("stageRationale")),
        industries=_industries(raw.get("industries")),
        geography=text(raw.get("geography"), "not stated"),
        businessModel={
            "type": text(business.get("type"), "not stated"),
            "revenueModel": text(business.get("revenueModel"), "not stated"),
            "pricing": text(business.get("pricing"), "not stated"),
            "customerType": text(business.get("customerType"), "not stated"),
            "unitEconomicsKnown": bool(business.get("unitEconomicsKnown")),
            "notes": text(business.get("notes")),
        },
        market={
            "description": text(market.get("description"), "not stated"),
            "tam": number_or_none(market.get("tam")),
            "sam": number_or_none(market.get("sam")),
            "som": number_or_none(market.get("som")),
            "growthRatePct": number_or_none(market.get("growthRatePct")),
            "sizingBasis": text(market.get("sizingBasis"), "not shown"),
            "notes": text(market.get("notes")),
        },
        product={
            "description": text(product.get("description"), "not stated"),
            "maturity": text(product.get("maturity"), "not stated"),
            "differentiation": text(product.get("differentiation"), "not stated"),
            "notes": text(product.get("notes")),
        },
        technology={
            "description": text(technology.get("description"), "not stated"),
            "coreTech": text(technology.get("coreTech"), "not stated"),
            "trlEstimate": number_or_none(technology.get("trlEstimate")),
            "ipPosition": text(technology.get("ipPosition"), "none stated"),
            "technicalRisk": text(technology.get("technicalRisk")),
            "notes": text(technology.get("notes")),
        },
        team={
            "size": number_or_none(team.get("size")),
            "founders": text(team.get("founders"), "not stated"),
            "domainExpertise": text(team.get("domainExpertise"), "not stated"),
            "gaps": text(team.get("gaps")),
            "notes": text(team.get("notes")),
        },
        traction={
            "customers": number_or_none(traction.get("customers")),
            "revenueUsd": number_or_none(traction.get("revenueUsd")),
            "growthNote": text(traction.get("growthNote")),
            "pilots": text(traction.get("pilots")),
            "notes": text(traction.get("notes")),
        },
        competition={
            "landscape": text(competition.get("landscape"), "not stated"),
            "namedCompetitors": strings(competition.get("namedCompetitors")),
            "defensibility": text(competition.get("defensibility"), "not stated"),
            "notes": text(competition.get("notes")),
        },
        financials={
            "monthlyBurnUsd": number_or_none(financials.get("monthlyBurnUsd")),
            "runwayMonths": number_or_none(financials.get("runwayMonths")),
            "grossMarginPct": number_or_none(financials.get("grossMarginPct")),
            "churnRatePct": number_or_none(financials.get("churnRatePct")),
            "notes": text(financials.get("notes")),
        },
        fundraising={
            "seeking": number_or_none(fundraising.get("seeking")),
            "instrument": text(fundraising.get("instrument"), "not stated"),
            "useOfFunds": text(fundraising.get("useOfFunds")),
            "notes": text(fundraising.get("notes")),
        },
        riskFlags=strings(raw.get("riskFlags")),
        dataGaps=normalise_gaps(raw.get("dataGaps")),
        evidence=evidence,
        evidenceQuality=evidence_quality(evidence),
    )


def normalise_critique(raw: Any) -> Critique:
    raw = raw if isinstance(raw, dict) else {}

    def assumption(entry: Any) -> Optional[UnsupportedAssumption]:
        if not isinstance(entry, dict) or not text(entry.get("claim")):
            return None
        return UnsupportedAssumption(
            claim=text(entry.get("claim")),
            why=text(entry.get("why")),
            methodologyId=text(entry.get("methodologyId"), "unknown"),
        )

    def contradiction(entry: Any) -> Optional[Contradiction]:
        if not isinstance(entry, dict) or not text(entry.get("statementA")):
            return None
        return Contradiction(
            statementA=text(entry.get("statementA")),
            statementB=text(entry.get("statementB")),
            why=text(entry.get("why")),
        )

    def red_flag(entry: Any) -> Optional[RedFlag]:
        if not isinstance(entry, dict) or not text(entry.get("title")):
            return None
        return RedFlag(
            title=text(entry.get("title")),
            detail=text(entry.get("detail")),
            severity=as_severity(entry.get("severity")),
        )

    def credibility(entry: Any) -> Optional[CredibilityCheck]:
        if not isinstance(entry, dict) or not text(entry.get("topic")):
            return None
        return CredibilityCheck(
            topic=text(entry.get("topic")),
            assessment=text(entry.get("assessment")),
            credible=bool(entry.get("credible")),
        )

    def rerun(entry: Any) -> Optional[RerunRequest]:
        if not isinstance(entry, dict) or not text(entry.get("methodologyId")):
            return None
        return RerunRequest(
            methodologyId=text(entry.get("methodologyId")),
            instruction=text(entry.get("instruction")),
        )

    return Critique(
        verdict=pick(raw.get("verdict"), ["pass", "revise", "insufficient_data"], "pass"),
        summary=text(raw.get("summary")),
        unsupportedAssumptions=each(raw.get("unsupportedAssumptions"), assumption),
        contradictions=each(raw.get("contradictions"), contradiction),
        redFlags=each(raw.get("redFlags"), red_flag),
        biasChecks=strings(raw.get("biasChecks")),
        credibilityChecks=each(raw.get("credibilityChecks"), credibility),
        missingInformation=normalise_gaps(raw.get("missingInformation")),
        rerunRequests=each(raw.get("rerunRequests"), rerun),
        confidenceCeiling=clamp(raw.get("confidenceCeiling"), 0, 1, 0.85),
    )


def normalise_sections(value: Any) -> list[ScoredSection]:
    def build(entry: Any) -> Optional[ScoredSection]:
        if not isinstance(entry, dict):
            return None
        title = text(entry.get("title"))
        if not title:
            return None
        return ScoredSection(
            key=text(entry.get("key")) or title.lower().replace(" ", "_"),
            title=title,
            score10=clamp(entry.get("score10"), 0, 10, 0),
            confidence=clamp(entry.get("confidence"), 0, 1, 0.5),
            narrative=text(entry.get("narrative")),
            evidence=strings(entry.get("evidence")),
            keyAssumptions=strings(entry.get("keyAssumptions")),
            missingInformation=strings(entry.get("missingInformation")),
        )

    return each(value, build)


def normalise_scenario(value: Any, fallback_label: str) -> Scenario:
    value = value if isinstance(value, dict) else {}
    return Scenario(
        label=text(value.get("label"), fallback_label),
        narrative=text(value.get("narrative"), "Not provided."),
        probability=clamp(value.get("probability"), 0, 1, 0.33),
        valuationUsd=number_or_none(value.get("valuationUsd")),
        drivers=strings(value.get("drivers")),
    )


def balance_scenarios(bull: Scenario, base: Scenario, bear: Scenario) -> None:
    """Rescale the three scenario probabilities to sum to 1."""
    total = bull.probability + base.probability + bear.probability
    if total <= 0:
        bull.probability, base.probability, bear.probability = 0.2, 0.55, 0.25
        return
    if abs(total - 1) < 0.02:
        return
    bull.probability = round(bull.probability / total, 2)
    bear.probability = round(bear.probability / total, 2)
    base.probability = round(1 - bull.probability - bear.probability, 2)


def normalise_comparison(raw: Any) -> dict[str, Any]:
    raw = raw if isinstance(raw, dict) else {}

    def dimension(entry: Any) -> Optional[dict[str, Any]]:
        if not isinstance(entry, dict):
            return None
        name = text(entry.get("dimension"))
        if not name:
            return None
        return {
            "dimension": name,
            "aScore10": clamp(entry.get("aScore10"), 0, 10, 0),
            "bScore10": clamp(entry.get("bScore10"), 0, 10, 0),
            "winner": pick(entry.get("winner"), ["a", "b", "tie"], "tie"),
            "reasoning": text(entry.get("reasoning")),
        }

    return {
        "summary": text(raw.get("summary")),
        "dimensions": each(raw.get("dimensions"), dimension),
        "evidenceQualityNote": text(raw.get("evidenceQualityNote")),
        "recommendedStartup": pick(raw.get("recommendedStartup"), ["a", "b", "neither"], "neither"),
        "recommendation": text(raw.get("recommendation")),
        "reasoning": text(raw.get("reasoning")),
        "confidence": clamp(raw.get("confidence"), 0, 1, 0.5),
        "conditions": strings(raw.get("conditions")),
    }
