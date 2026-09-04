"""Cross-language parity.

`fixtures/methodology-parity.json` is asserted by both this suite and the
TypeScript suite in `src/test/parity.test.ts`. If the Python service and the
manual calculators ever compute a published formula differently, one of the two
fails here rather than producing two different valuations in production.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.methodologies.berkus import compute_berkus
from app.methodologies.financial import compute_financial_health_score
from app.methodologies.first_chicago import compute_chicago_valuation, normalise_probabilities
from app.methodologies.readiness import READINESS_CRITERIA, compute_readiness_level, readiness_key
from app.methodologies.risk_factor import compute_risk_factor
from app.methodologies.scorecard import compute_scorecard, compute_scorecard_weight
from app.methodologies.vc_method import compute_vc_breakdown, compute_vc_valuation

FIXTURE = json.loads(
    (Path(__file__).resolve().parents[2] / "fixtures" / "methodology-parity.json").read_text(encoding="utf-8")
)


def _cases(key: str) -> list:
    return [case for case in FIXTURE[key] if isinstance(case, dict)]


def _ids(key: str) -> list[str]:
    return [case["case"] for case in _cases(key)]


@pytest.mark.parametrize("case", _cases("berkus"), ids=_ids("berkus"))
def test_berkus(case):
    assert compute_berkus(case["scores"]) == case["expected"]


@pytest.mark.parametrize("case", _cases("scorecard"), ids=_ids("scorecard"))
def test_scorecard(case):
    assert compute_scorecard(case["scores"], case["median"]) == case["expected"]


@pytest.mark.parametrize("case", _cases("scorecardWeight"), ids=_ids("scorecardWeight"))
def test_scorecard_weight(case):
    assert compute_scorecard_weight(case["scores"]) == pytest.approx(case["expected"], abs=1e-9)


@pytest.mark.parametrize("case", _cases("riskFactor"), ids=_ids("riskFactor"))
def test_risk_factor(case):
    assert compute_risk_factor(case["scores"], case["base"]) == case["expected"]


@pytest.mark.parametrize("case", _cases("vcMethod"), ids=_ids("vcMethod"))
def test_vc_method(case):
    breakdown = compute_vc_breakdown(
        revenue=case["revenue"], exit_multiple=case["exitMultiple"], exit_years=case["exitYears"],
        required_irr=case["requiredIrr"], investment_amount=case["investmentAmount"],
    )
    assert breakdown["exitValue"] == case["expectedExitValue"]
    assert compute_vc_valuation(
        revenue=case["revenue"], exit_multiple=case["exitMultiple"], exit_years=case["exitYears"],
        required_irr=case["requiredIrr"], investment_amount=case["investmentAmount"],
    ) == case["expected"]


@pytest.mark.parametrize("case", _cases("firstChicago"), ids=_ids("firstChicago"))
def test_first_chicago(case):
    assert compute_chicago_valuation(
        revenue=case["revenue"], exit_multiple=case["exitMultiple"], years_to_exit=case["yearsToExit"],
        discount_rates=case["discountRates"], probabilities=case["probabilities"],
    ) == case["expected"]


@pytest.mark.parametrize("case", _cases("probabilityNormalisation"), ids=_ids("probabilityNormalisation"))
def test_probability_normalisation(case):
    assert normalise_probabilities(case["input"]) == case["expected"]


@pytest.mark.parametrize("case", _cases("readiness"), ids=_ids("readiness"))
def test_readiness(case):
    prefix = case["prefix"]
    answers: dict[str, bool] = {}
    for level in range(1, case["completeThrough"] + 1):
        mandatory = READINESS_CRITERIA[prefix][level - 1][0]
        for index in range(mandatory):
            answers[readiness_key(prefix, level, "M", index)] = True

    removed = case.get("removeMandatoryAtLevel")
    if removed:
        answers.pop(readiness_key(prefix, removed, "M", 0), None)

    assert compute_readiness_level(answers, prefix) == case["expected"]


@pytest.mark.parametrize("case", _cases("financialHealth"), ids=_ids("financialHealth"))
def test_financial_health(case):
    assert compute_financial_health_score(case["snapshot"]) == case["expected"]
