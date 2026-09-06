"""Answering questions about the company under analysis.

This is the conversational half of the product. The workflow agents produce a
report; this answers whatever the user wants to know about it afterwards, in
their own words, without making them hunt through four panels for it.

It is deliberately not an agent in the registry. It runs no methodology, writes
nothing into the analysis, and cannot change a result. It reads what is already
there and explains it, which is why it is safe to let it answer freely while
the pipeline stays strictly structured.

The one rule it must not break is the one the whole product rests on: it
answers from the material it is given. A question the analysis cannot settle
gets told so, rather than filled in from what a company like this usually looks
like.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from .jsonspec import array, boolean, obj, string
from .llm import AgentError, llm

log = logging.getLogger("investvcs.ask")

#: Long enough to keep a conversation coherent, short enough that the context
#: stays mostly evidence rather than transcript.
MAX_HISTORY_TURNS = 10

#: A question is answered from the analysis, so the payload is capped rather
#: than trusted: a caller could otherwise paste an entire report into it.
MAX_QUESTION_CHARS = 2000

ANSWER_SCHEMA = obj({
    "answer": string(
        "The answer, in plain prose. Two or three short paragraphs at most, and one is usually better. "
        "Use the company's own figures where they exist. No markdown headings, no bullet characters."
    ),
    "basis": array(
        string("One specific thing you relied on, named as the user would recognise it - a methodology "
               "result, a figure from the material, or a section of the thesis."),
        "What this answer rests on. Empty if the answer is that the analysis does not establish it.",
    ),
    "grounded": boolean(
        "True when the answer comes from the supplied material. False when you had to say the analysis "
        "does not establish it, or you answered from general knowledge rather than this company's evidence."
    ),
})

INSTRUCTION = (
    "Answer the user's question about this specific company, using the analysis material supplied below.\n"
    "\n"
    "Ground every claim in that material. Where it gives you a figure, use the figure. Where the analysis "
    "reached a conclusion, say what it concluded and what it rested on.\n"
    "\n"
    "When the material does not settle the question, say so plainly and say what would settle it. That is a "
    "complete and useful answer; inventing a plausible one is not. Do not fill a gap with what a company of "
    "this type usually looks like, and do not restate a methodology's number as if it were a fact about the "
    "company when the analysis flagged it as low confidence.\n"
    "\n"
    "If no analysis has been run yet, answer from whatever description of the company exists and say that "
    "running the analysis would give a fuller answer.\n"
    "\n"
    "Write the way an analyst would answer a colleague: direct, specific, no preamble, no restating of the "
    "question, no offers of further help."
)


def _trim(value: Any, limit: int = 4000) -> Any:
    """Keep the context payload bounded without silently dropping structure."""
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + " […truncated]"
    return value


def _results_digest(results: Any) -> list[dict[str, Any]]:
    """The methodology results, reduced to what an answer actually needs.

    Full results carry every assigned input and evidence item, which is far more
    than a question needs and crowds out the rest of the context.
    """
    if not isinstance(results, dict):
        return []

    digest = []
    for result in results.values():
        if not isinstance(result, dict):
            continue
        valuation = result.get("valuation") or {}
        digest.append({
            "methodology": result.get("name") or result.get("methodologyId"),
            "status": result.get("status"),
            "confidence": result.get("confidence"),
            "score10": result.get("score10"),
            "valuation": valuation.get("point") if isinstance(valuation, dict) else None,
            "headline": _trim(result.get("headline"), 400),
        })
    return digest


def build_context(
    question: str,
    company: Optional[dict[str, Any]],
    history: Optional[list[dict[str, str]]],
) -> dict[str, Any]:
    """Assemble what the answering agent is allowed to see."""
    company = company or {}
    profile = company.get("profile")
    thesis = company.get("thesis")

    turns = [
        {"role": turn.get("role"), "content": _trim(turn.get("content"), 1500)}
        for turn in (history or [])[-MAX_HISTORY_TURNS:]
        if isinstance(turn, dict) and turn.get("role") in ("user", "assistant") and turn.get("content")
    ]

    return {
        "question": question[:MAX_QUESTION_CHARS],
        "conversationSoFar": turns,
        "company": {
            "name": company.get("startupName") or (profile or {}).get("name") or "",
            "founderDescription": _trim(company.get("narrative"), 6000),
            "profile": profile,
            "hasAnalysis": bool(company.get("results")),
            "methodologyResults": _results_digest(company.get("results")),
            "reconciledValuation": company.get("reconciled"),
            "investmentThesis": thesis,
            "criticFindings": company.get("critique"),
            "disagreements": company.get("disagreements"),
        },
    }


def _fallback(context: dict[str, Any], reason: str) -> dict[str, Any]:
    """What to say when the model cannot be reached.

    A chat that answers a question wrongly because the model was down is worse
    than one that says it is down, so this never attempts an answer.
    """
    log.warning("ask fell back: %s", reason)
    name = context["company"]["name"] or "this company"
    return {
        "answer": (
            f"I could not reach the analysis model just now, so I have not answered your question about "
            f"{name}. The report and methodology results already on screen are unaffected. Try again in a moment."
        ),
        "basis": [],
        "grounded": False,
        "degraded": True,
    }


async def answer(
    question: str,
    company: Optional[dict[str, Any]] = None,
    history: Optional[list[dict[str, str]]] = None,
) -> dict[str, Any]:
    context = build_context(question, company, history)

    try:
        response = await llm.run(
            role="ask",
            instruction=INSTRUCTION,
            schema=ANSWER_SCHEMA,
            context=context,
            label=question[:80],
        )
    except AgentError as error:
        return _fallback(context, str(error))

    output = response.output or {}
    answer_text = str(output.get("answer") or "").strip()
    if not answer_text:
        return _fallback(context, "empty answer")

    basis = [str(item).strip() for item in (output.get("basis") or []) if str(item).strip()]

    return {
        "answer": answer_text,
        "basis": basis,
        "grounded": bool(output.get("grounded")),
        "degraded": False,
    }


def mock_answer(question: str, company: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Canned reply for mock mode, so the chat is usable with no credentials."""
    name = (company or {}).get("startupName") or "the company"
    has_analysis = bool((company or {}).get("results"))
    return {
        "answer": (
            f"Mock answer about {name}: {json.dumps(question)[1:-1][:160]}. "
            + (
                "This reply is canned because the service is in mock mode; the analysis results on screen are real."
                if has_analysis
                else "No analysis has been run yet, so there is nothing to answer from."
            )
        ),
        "basis": ["Mock mode"],
        "grounded": False,
        "degraded": False,
    }
