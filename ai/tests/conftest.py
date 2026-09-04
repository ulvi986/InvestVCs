from __future__ import annotations

from typing import Any, Optional

import pytest

from app.schemas import InputBundle, MethodologyResult, StartupProfile, ValuationRange


@pytest.fixture
def bundle() -> InputBundle:
    return InputBundle(startupName="Test Co", narrative="A SaaS company selling workflow tooling to SMBs in the EU.")


def make_profile(**overrides: Any) -> StartupProfile:
    base = StartupProfile(
        name="Test Co",
        oneLiner="Workflow tooling for SMBs.",
        stage="seed",
        stageRationale="Has revenue and a small team.",
        industries=["saas"],
        geography="EU",
        businessModel={"type": "B2B SaaS", "revenueModel": "subscription", "pricing": "$500/mo",
                       "customerType": "SMB", "unitEconomicsKnown": True, "notes": ""},
        market={"description": "SMB workflow tooling", "tam": 5_000_000_000, "sam": 400_000_000,
                "som": 20_000_000, "growthRatePct": 14, "sizingBasis": "bottom-up", "notes": ""},
        technology={"description": "web stack", "coreTech": "none novel", "trlEstimate": 7,
                    "ipPosition": "none stated", "technicalRisk": "low", "notes": ""},
        team={"size": 6, "founders": "Two technical founders", "domainExpertise": "10 years", "gaps": "sales", "notes": ""},
        traction={"customers": 24, "revenueUsd": 180_000, "growthNote": "3x YoY", "pilots": "", "notes": ""},
        financials={"monthlyBurnUsd": 40_000, "runwayMonths": 11, "grossMarginPct": 74, "churnRatePct": 3, "notes": ""},
        fundraising={"seeking": 1_500_000, "instrument": "SAFE", "useOfFunds": "sales", "notes": ""},
        evidenceQuality=0.7,
    )
    return base.model_copy(update=overrides)


@pytest.fixture
def profile() -> StartupProfile:
    return make_profile()


def make_result(
    methodology_id: str,
    *,
    family: str = "valuation",
    status: str = "completed",
    valuation: Optional[tuple[float, float, float]] = None,
    score10: Optional[float] = None,
    confidence: float = 0.7,
    **overrides: Any,
) -> MethodologyResult:
    return MethodologyResult(
        methodologyId=methodology_id,
        name=methodology_id,
        family=family,
        status=status,
        valuation=ValuationRange(low=valuation[0], point=valuation[1], high=valuation[2]) if valuation else None,
        score10=score10,
        confidence=confidence,
        **overrides,
    )
