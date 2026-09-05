"""A critic-driven re-run must not destroy a result that was already good.

Found by running a real analysis rather than by reading: a seed-stage company
produced ten completed methodologies on the first pass, the critic asked for
revisions, and the second pass came back with `insufficient_input` for First
Chicago and zero confidence for Market Analysis. The original guard only
rejected a re-run whose status was `failed`, so those replaced good work.

The user-visible effect is the one that matters: an agent that had produced a
valuation appears to have produced nothing.
"""

from __future__ import annotations

from app.orchestrator import _supersedes
from tests.conftest import make_result


def test_a_first_result_is_always_taken():
    assert _supersedes(None, make_result("scorecard", confidence=0.4)) is True


def test_a_failed_rerun_never_replaces_a_good_result():
    previous = make_result("scorecard", confidence=0.39, valuation=(3e6, 4.2e6, 5e6))
    assert _supersedes(previous, make_result("scorecard", status="failed", confidence=0.0)) is False


def test_an_insufficient_input_rerun_never_replaces_a_good_result():
    """The First Chicago case: a completed valuation replaced by a shrug."""
    previous = make_result("first_chicago", confidence=0.32, valuation=(8e6, 2.09e7, 3e7))
    candidate = make_result("first_chicago", status="insufficient_input", confidence=0.0)
    assert _supersedes(previous, candidate) is False


def test_a_zero_confidence_rerun_never_replaces_a_confident_one():
    """The Market Analysis case: 0.15 replaced by 0.0."""
    previous = make_result("market_analysis", family="market", score10=6.0, confidence=0.15)
    candidate = make_result("market_analysis", family="market", score10=5.0, confidence=0.0)
    assert _supersedes(previous, candidate) is False


def test_a_genuine_revision_is_still_accepted():
    """The loop exists to improve answers, so a real revision must get through -
    including one the critic talked down."""
    previous = make_result("scorecard", confidence=0.39, valuation=(3e6, 4.2e6, 5e6))
    candidate = make_result("scorecard", confidence=0.28, valuation=(2.5e6, 3.4e6, 4e6))
    assert _supersedes(previous, candidate) is True


def test_a_rerun_can_rescue_a_result_that_had_no_confidence():
    """The guard is one-directional: it protects good work, it does not freeze
    a bad first pass in place."""
    previous = make_result("market_analysis", family="market", confidence=0.0)
    assert _supersedes(previous, make_result("market_analysis", family="market", confidence=0.31)) is True


def test_a_rerun_that_is_also_empty_changes_nothing_either_way():
    previous = make_result("market_analysis", family="market", confidence=0.0)
    candidate = make_result("market_analysis", family="market", confidence=0.0)
    # Neither is worth protecting; taking the newer one is harmless.
    assert _supersedes(previous, candidate) is True
