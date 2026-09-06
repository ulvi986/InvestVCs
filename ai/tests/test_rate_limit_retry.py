"""A rate limit is congestion, not a verdict.

Observed on the live service twice: an autonomous run finished with one
methodology marked failed and "Rate limit reached" in the degradations, while
everything around it completed. Nothing was wrong with the analysis or the
company - too many agents asked the deployment at once, that one lost, and the
user sees an agent that "did not work".

The per-call backoff inside the model client cannot fix this on its own: under
a deployment quota a whole wave exhausts its attempts together. Retrying the
losers one at a time, after the wave, removes the contention that caused it.
"""

from __future__ import annotations

from typing import Any

import pytest

from app import registry
from app.llm import AgentError, AgentResponse, llm
from app.mock import mock_output
from app.orchestrator import Orchestrator
from app.schemas import InputBundle

BUNDLE = InputBundle(
    startupName="Northwind Labs",
    narrative=(
        "Cross-border payments for logistics SMEs. Seed stage, 14 paying customers, "
        "42k MRR growing 11% month on month, 9 staff, raising 3.5m at 14m pre."
    ),
)

TARGET = "scorecard"


class RateLimitOnce:
    """Rate-limits one methodology's first attempt, then behaves."""

    def __init__(self, target: str = TARGET, failures: int = 1):
        self.target = target
        self.remaining = failures
        self.attempts: list[str] = []

    async def run(self, *, role: str, instruction: str, schema: Any, context: Any,
                  label: str = "", temperature: Any = None) -> AgentResponse:
        if role == "methodology":
            methodology_id = (context or {}).get("methodology", {}).get("id")
            self.attempts.append(methodology_id)
            if methodology_id == self.target and self.remaining > 0:
                self.remaining -= 1
                raise AgentError("Rate limit reached. Retry in a moment.", retryable=True, status=429)

        if role == "select":
            output = mock_output(role, context)
            output["selections"] = [
                {
                    "methodologyId": spec.id,
                    "selected": spec.id in ("scorecard", "risk_analysis", "market_analysis"),
                    "reason": "Chosen.",
                    "expectedConfidence": 0.7,
                }
                for spec in registry.REGISTRY
            ]
            return AgentResponse(output=output, duration_ms=5, model="harness")

        return AgentResponse(output=mock_output(role, context), duration_ms=5, model="harness")


async def run_with(stub, **kwargs) -> dict[str, Any]:
    orchestrator = Orchestrator(bundle=BUNDLE, mode="autonomous", concurrency=4, **kwargs)
    results, stages = {}, []
    async for event in orchestrator.stream():
        if event["type"] == "result":
            results[event["payload"]["methodologyId"]] = event["payload"]
        if event["type"] == "stage":
            stages.append(event["payload"].get("message", ""))
    return {"results": results, "stages": stages, "degraded": orchestrator.degraded}


async def test_a_methodology_that_only_hit_a_rate_limit_is_retried(monkeypatch):
    stub = RateLimitOnce()
    monkeypatch.setattr(llm, "run", stub.run)

    run = await run_with(stub)

    assert run["results"][TARGET]["status"] != "failed", "the rate-limited methodology was left failed"
    assert stub.attempts.count(TARGET) >= 2, "it was never retried"


async def test_the_retry_is_announced_rather_than_silent():
    """A user watching the run should see why it paused on one agent."""
    stub = RateLimitOnce()
    orchestrator = Orchestrator(bundle=BUNDLE, mode="autonomous", concurrency=4)
    import app.llm as llm_module

    original = llm_module.llm.run
    llm_module.llm.run = stub.run
    try:
        stages = []
        async for event in orchestrator.stream():
            if event["type"] == "stage":
                stages.append(event["payload"].get("message", ""))
    finally:
        llm_module.llm.run = original

    assert any("rate limit" in stage.lower() for stage in stages)


async def test_a_recovered_methodology_is_no_longer_reported_as_degraded(monkeypatch):
    """The report must not still say it failed once it has succeeded."""
    stub = RateLimitOnce()
    monkeypatch.setattr(llm, "run", stub.run)

    run = await run_with(stub)

    assert not any(
        "Scorecard" in note and "failed" in note for note in run["degraded"]
    ), run["degraded"]


async def test_a_methodology_that_keeps_being_rate_limited_stays_failed(monkeypatch):
    """The retry is one more attempt, not an infinite loop."""
    stub = RateLimitOnce(failures=99)
    monkeypatch.setattr(llm, "run", stub.run)

    run = await run_with(stub)

    assert run["results"][TARGET]["status"] == "failed"
    assert any("Scorecard" in note for note in run["degraded"])


async def test_a_failure_that_is_not_a_rate_limit_is_not_retried(monkeypatch):
    """Retrying a genuine error just spends money to fail again."""

    class AlwaysBroken(RateLimitOnce):
        async def run(self, *, role, instruction, schema, context, label="", temperature=None):
            if role == "methodology":
                methodology_id = (context or {}).get("methodology", {}).get("id")
                self.attempts.append(methodology_id)
                if methodology_id == self.target:
                    raise AgentError("Model did not return parseable JSON.")
            return AgentResponse(output=mock_output(role, context), duration_ms=5, model="harness")

    stub = AlwaysBroken()
    monkeypatch.setattr(llm, "run", stub.run)

    run = await run_with(stub)

    assert run["results"][TARGET]["status"] == "failed"
    assert stub.attempts.count(TARGET) == 1, "a non-rate-limit failure was retried"
