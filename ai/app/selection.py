"""Dynamic methodology selection.

Two stages, in this order:
  1. Deterministic gates from the registry rule out methodologies that cannot
     produce a meaningful answer for this startup.
  2. The planner agent ranks and explains what survives.

The gates run first on purpose: a model asked to pick from twelve options will
pick most of them, and a methodology applied outside its range produces a
confident answer that is simply wrong.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from . import registry
from .methodologies.base import Applicability
from .schemas import AnalysisPlan, InputBundle, PlanEntry, StartupProfile

#: Methodologies that always run — the report is not defensible without them.
MANDATORY_METHODOLOGY_IDS = ["risk_analysis"]


@dataclass
class GateResult:
    verdicts: dict[str, Applicability] = field(default_factory=dict)
    candidates: list[str] = field(default_factory=list)
    excluded: list[dict[str, str]] = field(default_factory=list)


def gate_methodologies(profile: StartupProfile, bundle: InputBundle) -> GateResult:
    result = GateResult()

    for spec in registry.active():
        try:
            verdict = (
                spec.gate(profile, bundle) if spec.gate
                else Applicability(True, 0.7, "No stage or industry restriction on this methodology.")
            )
        except Exception as error:  # noqa: BLE001 - a throwing gate must not take down selection
            verdict = Applicability(
                True, 0.4,
                f"Applicability check failed ({error}); included with reduced fit.",
            )

        if verdict.applicable and profile.stage not in spec.applicable_stages:
            verdict = Applicability(
                False, min(verdict.fit, 0.2),
                f"{spec.name} is defined for {', '.join(spec.applicable_stages)} companies; "
                f"this one is at {profile.stage} stage.",
            )

        if verdict.applicable and spec.excluded_industries:
            if any(tag in spec.excluded_industries for tag in profile.industries):
                verdict = Applicability(
                    False, 0.1,
                    f"{spec.name} is not meaningful for {', '.join(profile.industries)} companies.",
                )

        result.verdicts[spec.id] = verdict
        if verdict.applicable:
            result.candidates.append(spec.id)
        else:
            result.excluded.append({"methodologyId": spec.id, "reason": verdict.reason})

    # Never let the gates leave the analysis with nothing to say about value.
    if not any(registry.get(mid) and registry.require(mid).family == "valuation" for mid in result.candidates):
        valuation_specs = [spec for spec in registry.active() if spec.family == "valuation"]
        if valuation_specs:
            fallback = max(valuation_specs, key=lambda spec: result.verdicts.get(spec.id, Applicability(False, 0, "")).fit)
            result.candidates.append(fallback.id)
            result.verdicts[fallback.id] = Applicability(
                True,
                result.verdicts.get(fallback.id, Applicability(False, 0.3, "")).fit or 0.3,
                f"Every valuation methodology was gated out, so {fallback.name}, the closest fit, is run anyway with an "
                "explicit confidence penalty. Treat its output as indicative only.",
            )

    for mandatory_id in MANDATORY_METHODOLOGY_IDS:
        if mandatory_id not in result.candidates and registry.get(mandatory_id):
            result.candidates.append(mandatory_id)
            result.verdicts[mandatory_id] = Applicability(True, 1.0, "Mandatory for any investment recommendation.")

    return result


def build_plan(
    gate: GateResult,
    planner: Optional[dict[str, Any]],
    *,
    minimum_selected: int = 3,
    enforce_mandatory: bool = True,
) -> AnalysisPlan:
    """Merge the planner's choices with the deterministic gates. The gates win:
    the planner cannot re-enable something ruled out, and cannot drop a
    mandatory methodology."""
    raw_selections = (planner or {}).get("selections")
    by_id: dict[str, dict[str, Any]] = {}
    if isinstance(raw_selections, list):
        for selection in raw_selections:
            if isinstance(selection, dict) and selection.get("methodologyId"):
                by_id[str(selection["methodologyId"])] = selection

    entries: list[PlanEntry] = []
    for spec in registry.active():
        verdict = gate.verdicts.get(spec.id)
        choice = by_id.get(spec.id)

        if verdict is None or not verdict.applicable:
            reason = verdict.reason if verdict else "Not applicable to this startup."
            entries.append(PlanEntry(
                methodologyId=spec.id, selected=False, reason=reason,
                priority=spec.priority, expectedConfidence=0.0, gatedOut=reason,
            ))
            continue

        mandatory = enforce_mandatory and spec.id in MANDATORY_METHODOLOGY_IDS
        if mandatory:
            selected = True
        elif choice is not None:
            selected = choice.get("selected") is not False
        else:
            selected = verdict.fit >= 0.6

        reason = str(choice.get("reason") or "").strip() if choice else ""
        if not reason:
            reason = (
                "Mandatory: no investment recommendation is defensible without an explicit risk enumeration."
                if mandatory else verdict.reason
            )

        expected = choice.get("expectedConfidence") if choice else None
        try:
            expected_value = float(expected) if expected is not None else spec.base_confidence * verdict.fit
        except (TypeError, ValueError):
            expected_value = spec.base_confidence * verdict.fit

        entries.append(PlanEntry(
            methodologyId=spec.id,
            selected=selected,
            reason=reason,
            priority=spec.priority,
            expectedConfidence=min(spec.base_confidence, max(0.0, expected_value)),
        ))

    # If the planner was unusually restrictive, top up from the best-fitting
    # applicable methodologies so the report is not built on one data point.
    selected_count = len([entry for entry in entries if entry.selected])
    if selected_count < minimum_selected:
        toppable = sorted(
            [entry for entry in entries if not entry.selected and not entry.gatedOut],
            key=lambda entry: gate.verdicts.get(entry.methodologyId, Applicability(False, 0, "")).fit,
            reverse=True,
        )
        for entry in toppable[: minimum_selected - selected_count]:
            entry.selected = True
            entry.reason = (
                f"{entry.reason} (Added to reach a minimum of {minimum_selected} methodologies. "
                "A single-method conclusion cannot be cross-validated.)"
            )

    return AnalysisPlan(
        strategy=str((planner or {}).get("strategy") or "").strip()
        or "Balanced assessment across market, business model, risk and valuation.",
        focus=[str(item) for item in ((planner or {}).get("focus") or []) if str(item).strip()],
        entries=entries,
        notes=str((planner or {}).get("notes") or "").strip(),
    )


def build_manual_plan(gate: GateResult, chosen_ids: list[str], *, enforce_mandatory: bool = False) -> AnalysisPlan:
    """Guided and manual modes: the user's explicit choice, gates still applied.

    Guided mode still produces a full thesis, so the mandatory methodologies
    are kept. Manual mode runs exactly what was asked for and nothing else.
    """
    chosen = set(chosen_ids)
    return build_plan(
        gate,
        {
            "strategy": "User-selected methodologies.",
            "focus": [],
            "notes": "Methodology selection was made by the user, not by the planner agent.",
            "selections": [
                {
                    "methodologyId": spec.id,
                    "selected": spec.id in chosen,
                    "reason": "Selected by the user." if spec.id in chosen else "Not selected by the user.",
                }
                for spec in registry.active()
            ],
        },
        minimum_selected=0,
        enforce_mandatory=enforce_mandatory,
    )
