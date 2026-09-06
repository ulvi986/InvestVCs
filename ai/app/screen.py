"""Screening a company from its own website.

The full pipeline is twelve agents and several minutes. That is the right cost
for a company you are seriously considering and the wrong cost for one you have
just landed on. This is the cheap first pass: one model call over the text of a
page, answering whether this is worth the expensive look.

It deliberately does not value anything. A valuation from a marketing site
would be a number with nothing behind it, and the product's whole position is
that it does not produce those. What it returns is what the page establishes,
what it conspicuously avoids saying, and a recommendation about the next step.

The brief it extracts comes back with the reading, so the page the user just
screened is already in the analyst's material and they do not retype what the
site already says.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from .jsonspec import array, boolean, enum, number, obj, string
from .llm import AgentError, llm

log = logging.getLogger("investvcs.screen")

#: A marketing site is mostly repetition. Past this the extra tokens buy
#: nothing, and the model reads the navigation twice.
MAX_PAGE_CHARS = 24_000

STAGES = ["idea", "pre_seed", "seed", "series_a", "growth", "unclear"]

SCREEN_SCHEMA = obj({
    "company": string("The company's name as the page gives it. Empty string if the page never states it."),
    "oneLiner": string("What it sells and to whom, in one sentence, in your words rather than its slogan."),
    "stage": enum(STAGES, "Funding stage the evidence supports. 'unclear' when the page does not show it."),
    "stageReason": string("What on the page put it at that stage."),
    "signals": array(
        string("One concrete thing the page establishes: a named customer, a figure, a shipped product, a team fact."),
        "What this page actually evidences. Facts from the page, not impressions.",
    ),
    "flags": array(
        string("One thing a reader should be sceptical about, or a material question the page avoids."),
        "What is missing or overstated. A site with no pricing, no team and no customers is three flags.",
    ),
    "evidenceQuality": number(
        "0-1. How much of this reads as verifiable fact rather than positioning. A page of adjectives is low.",
        0, 1,
    ),
    "worthFullAnalysis": boolean(
        "Whether there is enough substance here that the twelve-agent analysis would produce something useful."
    ),
    "recommendation": string("One sentence on what to do next and why."),
})

INSTRUCTION = (
    "You are screening a company from the text of its own website.\n"
    "\n"
    "Treat the page as marketing copy, because that is what it is. Separate what it evidences from what it "
    "merely asserts: a named customer, a price, a shipped feature or a headcount is a signal; 'the leading "
    "platform' is not.\n"
    "\n"
    "Judge the absences too. A company site that never states pricing, never names a customer and never shows "
    "a team is telling you something, and it belongs in flags.\n"
    "\n"
    "Do not value the company and do not estimate revenue. You have a marketing page, which cannot support "
    "either. Say what the page shows and what it would take to go further.\n"
    "\n"
    "If the page is not a company at all - a blog post, a news article, a search results page - say so in the "
    "one-liner, set worthFullAnalysis to false, and do not invent a company around it."
)


def _clean(text: str) -> str:
    """Collapse the whitespace a scraped page is mostly made of."""
    return " ".join((text or "").split())[:MAX_PAGE_CHARS]


def _narrative(url: str, title: str, text: str, result: dict[str, Any]) -> str:
    """What the full analysis reads if the user carries this over.

    The page text goes in as well as the screen's reading of it: the agents
    should see the source, not only another model's summary of it.
    """
    lines = [
        f"Screened from {url}." if url else "Screened from a web page.",
        f"Page title: {title}." if title else "",
        "",
        f"What it appears to sell: {result.get('oneLiner') or 'not established'}.",
        f"Apparent stage: {result.get('stage') or 'unclear'}. {result.get('stageReason') or ''}".strip(),
        "",
    ]

    signals = [item for item in (result.get("signals") or []) if str(item).strip()]
    if signals:
        lines.append("What the site evidences:")
        lines += [f"- {item}" for item in signals]
        lines.append("")

    flags = [item for item in (result.get("flags") or []) if str(item).strip()]
    if flags:
        lines.append("What the site does not establish:")
        lines += [f"- {item}" for item in flags]
        lines.append("")

    lines.append("Raw page text follows; it is marketing copy and should be read as such.")
    lines.append(_clean(text))
    return "\n".join(line for line in lines if line is not None)

async def screen(url: str, title: str, text: str) -> dict[str, Any]:
    cleaned = _clean(text)
    if len(cleaned) < 200:
        return {
            "error": (
                "There is too little text on this page to screen. Open the company's home or product page "
                "and try again."
            ),
        }

    try:
        response = await llm.run(
            role="screen",
            instruction=INSTRUCTION,
            schema=SCREEN_SCHEMA,
            context={"url": url, "pageTitle": title, "pageText": cleaned},
            label=url[:80] or title[:80],
        )
    except AgentError as error:
        log.warning("screen failed: %s", error)
        return {"error": f"The page could not be screened: {error}"}

    result = dict(response.output or {})
    if not result:
        return {"error": "The screen returned nothing usable."}

    result["url"] = url
    result["brief"] = _narrative(url, title, text, result)
    return result


def mock_screen(url: str, title: str, text: str) -> dict[str, Any]:
    """Canned screen for mock mode, so the field works with no credentials."""
    name = title.split("|")[0].split("-")[0].strip() or "Mock Company"
    result = {
        "company": name,
        "oneLiner": "A mock reading of this page, produced without calling a model.",
        "stage": "unclear",
        "stageReason": "Mock mode: the page was not read.",
        "signals": ["Mock mode is on, so nothing here was extracted from the page."],
        "flags": ["Set AI_MOCK=0 and configure the model to screen for real."],
        "evidenceQuality": 0.0,
        "worthFullAnalysis": False,
        "recommendation": "Turn off mock mode to get a real screen.",
        "url": url,
    }
    result["brief"] = _narrative(url, title, text, result)
    return result
