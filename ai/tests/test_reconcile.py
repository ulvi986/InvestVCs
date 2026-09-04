from __future__ import annotations

import math

from app.reconcile import analyse_valuation_spread, detect_disagreements, finalise
from tests.conftest import make_result


def valuation(methodology_id: str, low: float, point: float, high: float, confidence: float = 0.8):
    return make_result(methodology_id, valuation=(low, point, high), confidence=confidence)


class TestSpread:
    def test_nothing_usable(self):
        spread = analyse_valuation_spread({})
        assert spread.provisional is None
        assert spread.entries == []
        assert spread.agreement == 0

    def test_ignores_methodologies_that_did_not_complete(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 1_000_000, 1_500_000, 2_000_000),
            "scorecard": make_result("scorecard", status="insufficient_input"),
            "vc_method": make_result("vc_method", status="failed", error="boom"),
        })
        assert [entry.methodology_id for entry in spread.entries] == ["berkus"]

    def test_ignores_non_valuation_methodologies(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 1_000_000, 1_500_000, 2_000_000),
            "market_analysis": make_result("market_analysis", family="market", score10=8),
        })
        assert len(spread.entries) == 1

    def test_only_counts_registry_methodologies(self):
        spread = analyse_valuation_spread({"not_real": valuation("not_real", 1, 1_000_000, 1)})
        assert spread.entries == []

    def test_high_agreement_when_methods_converge(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 900_000, 1_000_000, 1_100_000),
            "scorecard": valuation("scorecard", 1_000_000, 1_100_000, 1_200_000),
        })
        assert spread.spread_ratio == 1.1
        assert spread.agreement > 0.9

    def test_no_agreement_at_an_order_of_magnitude(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 400_000, 500_000, 600_000),
            "vc_method": valuation("vc_method", 4_000_000, 5_000_000, 6_000_000),
        })
        assert spread.spread_ratio == 10.0
        assert spread.agreement == 0

    def test_is_not_an_arithmetic_mean(self):
        """The point estimate is confidence-weighted and geometric."""
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 1_000_000, 1_000_000, 1_000_000, confidence=0.9),
            "scorecard": valuation("scorecard", 4_000_000, 4_000_000, 4_000_000, confidence=0.3),
        })
        arithmetic_mean = 2_500_000
        assert spread.provisional.point != arithmetic_mean
        # The high-confidence low estimate pulls the result below the midpoint.
        assert spread.provisional.point < arithmetic_mean
        assert spread.provisional.point > 1_000_000

    def test_range_spans_the_contributing_methods(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 800_000, 1_000_000, 1_300_000),
            "scorecard": valuation("scorecard", 900_000, 1_200_000, 1_900_000),
        })
        assert spread.provisional.low == 800_000
        assert spread.provisional.high == 1_900_000

    def test_flags_an_outlier_without_deleting_it(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 900_000, 1_000_000, 1_100_000),
            "scorecard": valuation("scorecard", 1_000_000, 1_100_000, 1_200_000),
            "risk_factor": valuation("risk_factor", 1_100_000, 1_200_000, 1_300_000),
            "vc_method": valuation("vc_method", 40_000_000, 50_000_000, 60_000_000),
        })
        assert [entry.methodology_id for entry in spread.outliers] == ["vc_method"]
        assert len(spread.entries) == 4
        assert len(spread.included) == 3
        assert "away from the median" in spread.outliers[0].outlier_reason

    def test_tight_cluster_of_three_has_no_outliers(self):
        spread = analyse_valuation_spread({
            "berkus": valuation("berkus", 900_000, 1_000_000, 1_100_000),
            "scorecard": valuation("scorecard", 1_100_000, 1_200_000, 1_300_000),
            "risk_factor": valuation("risk_factor", 1_400_000, 1_500_000, 1_600_000),
        })
        assert len(spread.entries) == 3
        assert spread.outliers == []


class TestDisagreements:
    def test_valuation_severity_scales_with_the_gap(self):
        moderate = {
            "berkus": valuation("berkus", 900_000, 1_000_000, 1_100_000),
            "vc_method": valuation("vc_method", 1_700_000, 2_000_000, 2_300_000),
        }
        found = detect_disagreements(moderate, analyse_valuation_spread(moderate))
        assert next(item for item in found if item.id == "valuation-spread").severity == "medium"

        wide = {
            "berkus": valuation("berkus", 400_000, 500_000, 600_000),
            "vc_method": valuation("vc_method", 2_500_000, 3_000_000, 3_500_000),
        }
        found = detect_disagreements(wide, analyse_valuation_spread(wide))
        entry = next(item for item in found if item.id == "valuation-spread")
        # 6x apart is not a nuance to be averaged away.
        assert entry.severity == "critical"
        assert len(entry.values) == 2
        # The critic fills these in — they start empty by design.
        assert entry.rootCause == ""
        assert entry.moreCredible == "unresolved"

    def test_quiet_when_methods_agree(self):
        results = {
            "berkus": valuation("berkus", 900_000, 1_000_000, 1_100_000),
            "scorecard": valuation("scorecard", 1_000_000, 1_100_000, 1_200_000),
        }
        found = detect_disagreements(results, analyse_valuation_spread(results))
        assert not [item for item in found if item.id == "valuation-spread"]

    def test_attractive_market_weak_defensibility(self):
        results = {
            "market_analysis": make_result("market_analysis", family="market", score10=9),
            "competitive_analysis": make_result("competitive_analysis", family="competitive", score10=3),
        }
        found = detect_disagreements(results, analyse_valuation_spread(results))
        assert "market-vs-defensibility" in [item.id for item in found]

    def test_trl_crl_gap(self):
        results = {
            "readiness_levels": make_result(
                "readiness_levels", family="readiness",
                computed={"trl": 8, "crl": 2, "techMarketGap": 6},
            ),
        }
        found = detect_disagreements(results, analyse_valuation_spread(results))
        gap = next(item for item in found if item.id == "trl-crl-gap")
        assert gap.severity == "high"

    def test_large_market_no_demand(self):
        results = {
            "market_analysis": make_result("market_analysis", family="market", score10=9),
            "team_traction": make_result("team_traction", family="team", score10=2),
        }
        found = detect_disagreements(results, analyse_valuation_spread(results))
        assert "market-vs-traction" in [item.id for item in found]

    def test_valuation_unsupported_by_financials(self):
        results = {
            "berkus": valuation("berkus", 2_500_000, 3_000_000, 3_500_000),
            "financial_analysis": make_result("financial_analysis", family="financial", score10=2),
        }
        found = detect_disagreements(results, analyse_valuation_spread(results))
        assert "valuation-vs-financial-health" in [item.id for item in found]


class TestReconciliation:
    results = {
        "berkus": valuation("berkus", 900_000, 1_000_000, 1_100_000, confidence=0.8),
        "scorecard": valuation("scorecard", 1_800_000, 2_000_000, 2_400_000, confidence=0.6),
    }

    def test_documents_its_method_and_weights(self):
        reconciled = finalise(analyse_valuation_spread(self.results), None)
        assert 1_000_000 < reconciled.range.point < 2_000_000
        assert reconciled.range.low == 900_000
        assert reconciled.range.high == 2_400_000
        assert "geometric" in reconciled.method.lower()
        assert len(reconciled.weights) == 2
        assert math.isclose(sum(weight.weight for weight in reconciled.weights), 1.0, abs_tol=0.01)

    def test_honours_a_critic_exclusion(self):
        reconciled = finalise(analyse_valuation_spread(self.results), {
            "exclude": [{"methodologyId": "scorecard", "reason": "Comparables median was asserted, not derived."}],
        })
        assert reconciled.range.point == 1_000_000
        assert "scorecard" in [item.methodologyId for item in reconciled.excluded]
        assert "asserted" in reconciled.excluded[0].reason

    def test_honours_a_critic_reweight(self):
        baseline = finalise(analyse_valuation_spread(self.results), None)
        reweighted = finalise(analyse_valuation_spread(self.results), {
            "reweight": [{"methodologyId": "scorecard", "multiplier": 3, "rationale": "Best fit for this stage."}],
        })
        assert reweighted.range.point > baseline.range.point
        assert "Best fit" in next(w.rationale for w in reweighted.weights if w.methodologyId == "scorecard")

    def test_clamps_an_absurd_multiplier(self):
        reconciled = finalise(analyse_valuation_spread(self.results), {
            "reweight": [{"methodologyId": "scorecard", "multiplier": 10_000, "rationale": "x"}],
        })
        scorecard_weight = next(w.weight for w in reconciled.weights if w.methodologyId == "scorecard")
        assert scorecard_weight < 1

    def test_critic_can_override_the_range(self):
        reconciled = finalise(analyse_valuation_spread(self.results), {
            "overrideRange": {"low": 500_000, "point": 800_000, "high": 1_200_000,
                              "rationale": "Both methods share a bad anchor."},
        })
        assert reconciled.range.point == 800_000
        assert "bad anchor" in reconciled.method

    def test_confidence_drops_when_methods_disagree(self):
        tight = finalise(analyse_valuation_spread({
            "berkus": valuation("berkus", 1_000_000, 1_000_000, 1_000_000, confidence=0.9),
            "scorecard": valuation("scorecard", 1_050_000, 1_050_000, 1_050_000, confidence=0.9),
        }), None)
        wide = finalise(analyse_valuation_spread({
            "berkus": valuation("berkus", 500_000, 500_000, 500_000, confidence=0.9),
            "scorecard": valuation("scorecard", 4_500_000, 4_500_000, 4_500_000, confidence=0.9),
        }), None)
        assert tight.confidence > 0.5
        assert wide.confidence < tight.confidence

    def test_returns_zero_range_when_nothing_survives(self):
        reconciled = finalise(analyse_valuation_spread({}), None)
        assert reconciled.range.point == 0
        assert "no valuation methodology" in reconciled.method.lower()
