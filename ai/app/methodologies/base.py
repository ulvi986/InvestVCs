"""Methodology contract.

Every methodology declares what it needs, what it can answer, where it is
valid, and how much it can ever be trusted. The orchestrator, critic,
reconciler and UI read only this — none of them know any methodology by name.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Union

from ..jsonspec import Schema
from ..schemas import ComputeOutput, InputBundle, MethodologyFamily, StartupProfile


@dataclass
class InputSpec:
    key: str
    label: str
    description: str


@dataclass
class Applicability:
    applicable: bool
    #: 0..1 — how well this methodology fits, before the planner ranks it.
    fit: float
    reason: str


@dataclass
class ComputeContext:
    profile: StartupProfile
    bundle: InputBundle
    results: dict[str, Any]


ComputeFn = Callable[[dict[str, Any], ComputeContext], ComputeOutput]
GateFn = Callable[[StartupProfile, InputBundle], Applicability]


@dataclass
class MethodologySpec:
    id: str
    name: str
    family: MethodologyFamily
    description: str
    #: The question this methodology is actually able to answer.
    purpose: str
    output_schema: Schema
    instruction: str
    applicable_stages: list[str]
    #: Ceiling on how much this methodology can ever be trusted on its own.
    base_confidence: float
    limitations: list[str]
    #: Lower runs earlier; same priority with satisfied deps runs in parallel.
    priority: int
    required_inputs: list[InputSpec] = field(default_factory=list)
    optional_inputs: list[InputSpec] = field(default_factory=list)
    applicable_industries: Union[list[str], str] = "any"
    excluded_industries: list[str] = field(default_factory=list)
    depends_on: list[str] = field(default_factory=list)
    compute: Optional[ComputeFn] = None
    gate: Optional[GateFn] = None

    def summary(self) -> dict[str, Any]:
        """Compact description for the planner and the frontend. Deliberately
        excludes the output schema — the planner chooses, it does not run."""
        return {
            "id": self.id,
            "name": self.name,
            "family": self.family,
            "purpose": self.purpose,
            "description": self.description,
            "requiredInputs": [f"{item.label}: {item.description}" for item in self.required_inputs],
            "optionalInputs": [f"{item.label}: {item.description}" for item in self.optional_inputs],
            "applicableStages": self.applicable_stages,
            "applicableIndustries": self.applicable_industries,
            "baseConfidence": self.base_confidence,
            "limitations": self.limitations,
            "dependsOn": self.depends_on,
            "priority": self.priority,
        }


# ── Small numeric helpers shared by the methodology modules ──────────────


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    if result != result or result in (float("inf"), float("-inf")):  # NaN / inf
        return default
    return result


def clamp(value: Any, low: float, high: float, default: Optional[float] = None) -> float:
    number = to_float(value, default if default is not None else low)
    return max(low, min(high, number))


def clamp_int(value: Any, low: int, high: int, default: int = 0) -> int:
    return int(round(clamp(value, low, high, default)))


def finite_or_none(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if result != result or result in (float("inf"), float("-inf")):
        return None
    return result
