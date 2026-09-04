"""User-defined agents.

The registry docstring promises that adding a methodology means adding a spec
and nothing else. This module takes that literally and builds a MethodologySpec
from a definition supplied over HTTP, so an agent a user adds in the UI is a
first-class methodology: it is gated, planned, executed, criticised and
reconciled by exactly the same code paths as the built-in twelve.

What a custom agent does not get is a deterministic compute step. The built-in
methodologies each carry hand-written arithmetic that cross-checks the model;
a user-defined one has none, so its confidence is capped lower and the
limitation is stated on the spec rather than hidden.

Custom specs live in a ContextVar overlay for the duration of one run, so two
concurrent analyses cannot see each other's agents.
"""

from __future__ import annotations

import re
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator, Optional

from .jsonspec import array, methodology_schema, number, obj, string
from .methodologies.base import Applicability, ComputeContext, InputSpec, MethodologySpec
from .schemas import ComputeOutput

#: Families a custom agent may declare. Keeping this closed means the critic
#: and the reconciler continue to reason about families they understand.
FAMILIES = ["market", "competitive", "team", "business_model", "readiness", "financial", "risk"]

#: A user-defined agent cannot be trusted as far as one with deterministic
#: arithmetic behind it, however good its instruction is.
MAX_BASE_CONFIDENCE = 0.55

CUSTOM_ID_PREFIX = "custom_"

_overlay: ContextVar[dict[str, MethodologySpec]] = ContextVar("custom_specs", default={})


def slug(name: str) -> str:
    """A stable, registry-safe id for a user-supplied agent name."""
    cleaned = re.sub(r"[^a-z0-9]+", "_", (name or "").strip().lower()).strip("_")
    return f"{CUSTOM_ID_PREFIX}{cleaned or 'agent'}"


def is_custom(methodology_id: str) -> bool:
    return methodology_id.startswith(CUSTOM_ID_PREFIX)


def _output_schema():
    """The shape every custom agent returns.

    Deliberately generic: a score, a written assessment, findings and the
    evidence behind them. The valuation fields are absent because a user-
    defined agent may not price a company; that stays with the methodologies
    whose arithmetic is reviewable.
    """
    return methodology_schema(obj({
        "assessment": string("What you found, in two or three sentences. Specific to this company."),
        "score10": number("0-10 on the question this agent was asked. 0 when the material does not support a judgement.", 0, 10),
        "findings": array(string("One specific finding, stated as a fact about this company."), "What you established."),
        "concerns": array(string("One specific concern this analysis raises."), "What worries you."),
        "unknowns": array(string("Something you would need in order to answer properly."), "What you could not establish."),
    }))


def _compute(inputs: dict[str, Any], _ctx: ComputeContext) -> ComputeOutput:
    """No arithmetic to check the model with, so this only normalises the score
    and records why the confidence is capped."""
    raw = inputs.get("score10")
    try:
        score10 = max(0.0, min(10.0, float(raw)))
    except (TypeError, ValueError):
        score10 = 0.0

    return ComputeOutput(
        score10=round(score10, 1),
        computed={"score10": round(score10, 1)},
        # There is no independent calculation to corroborate the judgement.
        confidencePenalty=0.1,
        notes=["User-defined agent: the score is the model's judgement, with no deterministic cross-check behind it."],
    )


def build_spec(
    *,
    name: str,
    purpose: str,
    instruction: str,
    family: str = "risk",
    required_inputs: Optional[list[str]] = None,
    agent_id: Optional[str] = None,
) -> MethodologySpec:
    """Turn a user's definition into a real methodology spec."""
    resolved_family = family if family in FAMILIES else "risk"
    resolved_id = agent_id if agent_id and is_custom(agent_id) else slug(name)

    needs = [
        InputSpec(key.strip(), key.strip().replace("_", " ").title(), "Required by this agent.")
        for key in (required_inputs or [])
        if key and key.strip()
    ]

    return MethodologySpec(
        id=resolved_id,
        name=name.strip() or "Custom agent",
        family=resolved_family,  # type: ignore[arg-type]
        description=purpose.strip(),
        purpose=purpose.strip() or "A question this team wanted asked of every company.",
        required_inputs=needs,
        optional_inputs=[],
        output_schema=_output_schema(),
        applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
        base_confidence=MAX_BASE_CONFIDENCE,
        limitations=[
            "User-defined agent: no deterministic calculation cross-checks its judgement.",
            "It reads the same material as the other agents and has no additional data source.",
        ],
        # Runs alongside the analytical methodologies, before the valuation
        # wave, so its findings are available to the critic.
        priority=25,
        instruction=(
            f"{instruction.strip()}\n\n"
            "Answer only from the material you are given. Where the material does not support a judgement, "
            "score 0 and say so in the unknowns rather than inferring."
        ),
        compute=_compute,
        gate=lambda _profile, _bundle: Applicability(
            True, 0.6, "Added by your team, so it is offered for every company."
        ),
    )


# ── Per-run overlay ──────────────────────────────────────────────────────


@contextmanager
def overlay(specs: list[MethodologySpec]) -> Iterator[None]:
    """Make these specs visible to the registry for the duration of one run."""
    token = _overlay.set({spec.id: spec for spec in specs})
    try:
        yield
    finally:
        _overlay.reset(token)


def active() -> dict[str, MethodologySpec]:
    return _overlay.get()
