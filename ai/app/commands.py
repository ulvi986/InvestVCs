"""Natural-language command → executable workflow.

This is the layer that lets the user say what they want done instead of
finding the right feature. The model maps the instruction onto the registry;
a deterministic keyword fallback keeps the command bar usable when the model
is unavailable, because a command bar that fails closed is worse than one that
occasionally over-selects.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Optional

from . import custom, registry
from .jsonspec import array, boolean, enum, obj, string
from .config import settings
from .llm import AgentError, llm
from .workflow import Workflow, build_workflow

log = logging.getLogger("investvcs.commands")

INTENTS = ["evaluate", "valuation", "market", "competition", "risk", "memo", "compare", "custom"]

COMMAND_SCHEMA = obj({
    "intent": enum(INTENTS, "What the user is asking for."),
    "goal": string("The user's instruction restated as a single objective sentence for the workflow."),
    "name": string("A short workflow name, three or four words."),
    "reply": string("One or two sentences telling the user what you are about to run and why. Plain, not chatty."),
    "methodologyIds": array(
        string("A methodology id from the registry."),
        "The methodologies this instruction needs. Empty means every applicable one.",
    ),
    "approvals": array(
        string("A node id to pause at: understand, select, critic, reconcile, synthesis, or methodology:<id>."),
        "Where a human should approve before the workflow continues. Usually empty.",
    ),
    "needsStartup": boolean("Does this instruction require a startup to already be loaded?"),
    "clarification": string("If the instruction is too vague to act on, the one question you would ask. Otherwise an empty string."),
})

INSTRUCTION = (
    "Translate the user's instruction into an executable analysis workflow over the methodology registry you are given. "
    "Choose the smallest set of methodologies that actually answers the instruction — a request about competitors should not "
    "run five valuation methods. If the user names a methodology, include it. If the instruction is a general evaluation, "
    "return an empty methodologyIds list so the planner selects for this specific company. "
    "Add an approval checkpoint only where a human genuinely needs to intervene before the work continues. "
    "Never invent methodology ids."
)


@dataclass
class CommandPlan:
    intent: str
    goal: str
    name: str
    reply: str
    methodology_ids: list[str]
    approvals: list[str]
    needs_startup: bool
    clarification: str
    #: True when the model was unavailable and keyword matching was used.
    fallback: bool = False

    def to_workflow(self) -> Workflow:
        return build_workflow(
            workflow_id=self.intent,
            name=self.name or "Analysis",
            goal=self.goal,
            methodology_ids=self.methodology_ids or None,
            approvals=self.approvals,
            origin="orchestrator",
            strategy=self.reply,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "intent": self.intent,
            "goal": self.goal,
            "name": self.name,
            "reply": self.reply,
            "methodologyIds": self.methodology_ids,
            "approvals": self.approvals,
            "needsStartup": self.needs_startup,
            "clarification": self.clarification,
            "fallback": self.fallback,
            "workflow": self.to_workflow().to_dict(),
        }


# ── Deterministic fallback ───────────────────────────────────────────────

_KEYWORDS: list[tuple[str, str, list[str]]] = [
    # (intent, regex, methodology ids). First match wins, so order matters.
    #
    # The word boundary on "valuat" is load-bearing: "evaluate" contains it,
    # and a general evaluation must not be routed into the valuation bucket.
    (
        "valuation",
        r"\bvaluat|\bvalue\b|\bworth\b|\bpric(e|ing)\b|berkus|scorecard|pre-?money|post-?money|first chicago",
        ["berkus", "scorecard", "risk_factor", "vc_method", "first_chicago", "risk_analysis"],
    ),
    (
        "competition",
        r"competitor|competit|moat|defensib|rival|landscape",
        ["competitive_analysis", "market_analysis", "risk_analysis"],
    ),
    (
        "market",
        r"\bmarket\b|\btam\b|\bsam\b|\bsom\b|market siz|\bopportunity\b",
        ["market_analysis", "competitive_analysis", "risk_analysis"],
    ),
    (
        "risk",
        r"\brisk|red flag|what could go wrong|downside|danger",
        ["risk_analysis", "financial_analysis", "competitive_analysis"],
    ),
    ("memo", r"\bmemo\b|investment committee|\bic\b|write.*report|prepare.*committee", []),
    ("compare", r"\bcompare\b|\bversus\b|\bvs\b|against each other", []),
    ("evaluate", r"evaluat|assess|analys|analyz|investable|invest in|due diligence|screen", []),
]


_METHODOLOGY_NAME_HINTS: dict[str, str] = {
    "berkus": "berkus",
    "scorecard": "scorecard",
    "risk factor": "risk_factor",
    "vc method": "vc_method",
    "first chicago": "first_chicago",
    "trl": "readiness_levels",
    "readiness": "readiness_levels",
    "business model": "business_model_canvas",
    "canvas": "business_model_canvas",
    "financial": "financial_analysis",
    "traction": "team_traction",
    "team": "team_traction",
}


def fallback_plan(command: str) -> CommandPlan:
    """Keyword routing, used when the model cannot be reached."""
    text = command.lower().strip()

    named = [
        methodology_id for hint, methodology_id in _METHODOLOGY_NAME_HINTS.items()
        if hint in text and registry.get(methodology_id)
    ]

    # A team's own agents have no entry in the static hint table, so match them
    # by the name the user gave them. Without this the keyword path is the one
    # place a custom agent cannot be asked for by name - which is also the path
    # mock mode always takes, and the one a model outage falls back to.
    named += [
        spec.id for spec in custom.active().values()
        if spec.name.strip() and spec.name.strip().lower() in text
    ]
    named = list(dict.fromkeys(named))

    intent, methodology_ids = "evaluate", []
    for candidate, pattern, ids in _KEYWORDS:
        if re.search(pattern, text):
            intent, methodology_ids = candidate, list(ids)
            break

    # An explicitly named methodology always wins over the keyword bucket.
    if named:
        # Pair a named methodology with the risk screen, unless the user only
        # named their own agents - in that case run exactly what they asked for.
        companion = [] if all(custom.is_custom(mid) for mid in named) else ["risk_analysis"]
        methodology_ids = list(dict.fromkeys(named + companion))

    return CommandPlan(
        intent=intent,
        goal=command.strip() or "Evaluate this startup.",
        name={
            "valuation": "Valuation run",
            "competition": "Competitive screen",
            "market": "Market assessment",
            "risk": "Risk screen",
            "memo": "Investment memo",
            "compare": "Startup comparison",
        }.get(intent, "Startup evaluation"),
        reply=(
            "Routed by keyword because the planning model was unavailable. "
            "Check the workflow below before running it."
        ),
        methodology_ids=[mid for mid in methodology_ids if registry.get(mid)],
        approvals=[],
        needs_startup=intent != "compare",
        clarification="",
        fallback=True,
    )


# ── Model-backed compilation ─────────────────────────────────────────────


async def compile_command(command: str, context: Optional[dict[str, Any]] = None) -> CommandPlan:
    # In mock mode the keyword router is the real behaviour, not a stub, so it
    # gives a far more useful answer than canned model output would.
    if settings.mock:
        return fallback_plan(command)

    instruction_context = {
        "userInstruction": command,
        "availableMethodologies": [
            {"id": spec.id, "name": spec.name, "purpose": spec.purpose, "family": spec.family}
            for spec in registry.active()
        ],
        "approvalPoints": ["understand", "select", "critic", "reconcile", "synthesis"],
        "loadedStartup": (context or {}).get("startup"),
    }

    try:
        response = await llm.run(
            role="select",
            instruction=INSTRUCTION,
            schema=COMMAND_SCHEMA,
            context=instruction_context,
            label=command[:80],
        )
    except AgentError as error:
        log.warning("command compilation fell back to keywords: %s", error)
        return fallback_plan(command)

    raw = response.output or {}
    known = {spec.id for spec in registry.active()}

    methodology_ids = [
        str(item) for item in (raw.get("methodologyIds") or [])
        if isinstance(item, (str, bytes)) and str(item) in known
    ]

    valid_approvals = {"understand", "select", "critic", "reconcile", "synthesis"}
    approvals = [
        str(item) for item in (raw.get("approvals") or [])
        if str(item) in valid_approvals
        or (str(item).startswith("methodology:") and str(item).split(":", 1)[1] in known)
    ]

    intent = str(raw.get("intent") or "evaluate")
    return CommandPlan(
        intent=intent if intent in INTENTS else "custom",
        goal=str(raw.get("goal") or command).strip(),
        name=str(raw.get("name") or "Startup evaluation").strip(),
        reply=str(raw.get("reply") or "").strip(),
        methodology_ids=list(dict.fromkeys(methodology_ids)),
        approvals=list(dict.fromkeys(approvals)),
        needs_startup=bool(raw.get("needsStartup", True)),
        clarification=str(raw.get("clarification") or "").strip(),
    )
