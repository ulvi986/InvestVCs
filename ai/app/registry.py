"""Central methodology registry.

The extension point of the whole system: adding an investment methodology means
adding one spec module and one line here. Nothing in the orchestrator, critic,
reconciler or UI is hardcoded to a specific methodology id.
"""

from __future__ import annotations

from .methodologies import (
    berkus, bmc, competitive, financial, first_chicago, market,
    readiness, risk_analysis, risk_factor, scorecard, team_traction, vc_method,
)
from . import custom
from .methodologies.base import MethodologySpec

REGISTRY: list[MethodologySpec] = [
    # Context first — these inform how the valuation methods are parameterised.
    market.SPEC,
    competitive.SPEC,
    team_traction.SPEC,
    bmc.SPEC,
    readiness.SPEC,
    financial.SPEC,
    # Valuation.
    berkus.SPEC,
    scorecard.SPEC,
    risk_factor.SPEC,
    vc_method.SPEC,
    first_chicago.SPEC,
    # Synthesis input.
    risk_analysis.SPEC,
]

_BY_ID: dict[str, MethodologySpec] = {spec.id: spec for spec in REGISTRY}


def active() -> list[MethodologySpec]:
    """Every methodology this run may draw on: the built-ins plus whatever
    user-defined agents the request carried. Iterate this rather than REGISTRY
    anywhere a custom agent should be a candidate."""
    extra = custom.active()
    return REGISTRY + list(extra.values()) if extra else REGISTRY


def get(methodology_id: str) -> MethodologySpec | None:
    return custom.active().get(methodology_id) or _BY_ID.get(methodology_id)


def require(methodology_id: str) -> MethodologySpec:
    spec = get(methodology_id)
    if spec is None:
        raise KeyError(f"Unknown methodology: {methodology_id}")
    return spec


def name_of(methodology_id: str) -> str:
    spec = get(methodology_id)
    return spec.name if spec else methodology_id


def summaries(specs: list[MethodologySpec] | None = None) -> list[dict]:
    return [spec.summary() for spec in (specs if specs is not None else active())]


def plan_execution_waves(ids: list[str]) -> list[list[str]]:
    """Order methodologies into waves. Everything in a wave is independent and
    runs in parallel; the next wave starts once the previous one settles."""
    remaining = {spec.id: spec for spec in (get(mid) for mid in ids) if spec is not None}
    done: set[str] = set()
    waves: list[list[str]] = []

    while remaining:
        ready = [
            spec for spec in remaining.values()
            if all(dep in done or dep not in remaining for dep in spec.depends_on)
        ]
        # A dependency cycle would otherwise spin forever; break it by priority
        # rather than dropping the methodologies silently.
        candidates = ready or list(remaining.values())

        min_priority = min(spec.priority for spec in candidates)
        batch = [spec for spec in candidates if spec.priority == min_priority]

        waves.append([spec.id for spec in batch])
        for spec in batch:
            remaining.pop(spec.id, None)
            done.add(spec.id)

    return waves
