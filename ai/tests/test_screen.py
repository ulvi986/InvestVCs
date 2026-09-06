"""Screening a company from its website.

The screener reads text nobody vetted, from a site nobody controls, so the
things worth pinning are the boundaries: it refuses a page with nothing on it,
it hands the full analysis the source rather than only its own summary, and it
never puts a number on a marketing page.
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from app import fetchpage
from app import screen as screen_module
from app.config import settings
from app.llm import AgentError, AgentResponse, llm
from app.main import app

PAGE = (
    "Northwind Labs builds cross-border payment rails for logistics operators. "
    "Trusted by DSV and Girteka. Pricing starts at 490 EUR per month. "
    "We are a team of nine in Tallinn. " * 6
)

SCREEN_OUTPUT = {
    "company": "Northwind Labs",
    "oneLiner": "Cross-border payment rails sold to logistics operators.",
    "stage": "seed",
    "stageReason": "Named customers and public pricing, small team.",
    "signals": ["Names DSV and Girteka as customers", "Publishes pricing from 490 EUR/month"],
    "flags": ["No licence position stated"],
    "evidenceQuality": 0.6,
    "worthFullAnalysis": True,
    "recommendation": "Worth the full analysis; ask about the licence position first.",
}


@pytest.fixture
def screened(monkeypatch):
    async def reply(**_kwargs):
        return AgentResponse(output=dict(SCREEN_OUTPUT), duration_ms=5, model="harness")

    monkeypatch.setattr(llm, "run", reply)


# ── Refusing what it cannot screen ───────────────────────────────────────


async def test_a_page_with_almost_no_text_is_refused():
    result = await screen_module.screen("https://example.com", "Example", "Hello.")
    assert "too little text" in result["error"]


async def test_an_unreachable_model_is_reported_rather_than_guessed_at(monkeypatch):
    async def boom(**_kwargs):
        raise AgentError("Rate limit reached.")

    monkeypatch.setattr(llm, "run", boom)
    result = await screen_module.screen("https://example.com", "Example", PAGE)
    assert "could not be screened" in result["error"]


# ── What it returns ──────────────────────────────────────────────────────


async def test_a_screen_returns_its_reading(screened):
    result = await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE)

    assert result["company"] == "Northwind Labs"
    assert result["worthFullAnalysis"] is True
    assert result["url"] == "https://northwind.example"


async def test_the_brief_carries_the_page_itself_not_only_the_summary(screened):
    """The agents should read the source. A summary of a summary loses exactly
    the specifics the analysis is for."""
    brief = (await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE))["brief"]

    assert "DSV" in brief, "the page text did not reach the brief"
    assert "Names DSV and Girteka as customers" in brief


async def test_the_brief_says_the_page_is_marketing_copy(screened):
    """The agents weigh evidence by how it was known, so where this came from
    has to travel with it."""
    brief = (await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE))["brief"]
    assert "marketing copy" in brief
    assert "https://northwind.example" in brief


async def test_the_screen_never_puts_a_number_on_a_marketing_page(screened):
    """The one output this product must not produce from a website."""
    result = await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE)
    assert "valuation" not in result
    assert "valuation" not in screen_module.SCREEN_SCHEMA["properties"]


async def test_an_enormous_page_is_truncated_before_it_reaches_the_model(monkeypatch):
    captured = {}

    async def capture(**kwargs):
        captured["chars"] = len(kwargs["context"]["pageText"])
        return AgentResponse(output=dict(SCREEN_OUTPUT), duration_ms=1, model="harness")

    monkeypatch.setattr(llm, "run", capture)
    await screen_module.screen("https://example.com", "Big", "word " * 200_000)

    assert captured["chars"] <= screen_module.MAX_PAGE_CHARS


# ── The endpoint ─────────────────────────────────────────────────────────


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings.__class__, "mock", property(lambda _self: True))
    with TestClient(app) as test_client:
        yield test_client


def test_the_endpoint_reads_a_url_the_user_pasted(client, monkeypatch):
    """The web app sends an address, not page text: a browser cannot read
    another origin, which is why the service does the fetching."""
    async def fake_fetch(url):
        return "https://northwind.example/", "Northwind Labs", PAGE

    monkeypatch.setattr(fetchpage, "fetch", fake_fetch)

    response = client.post("/screen", json={"url": "northwind.example"})
    assert response.status_code == 200
    assert response.json()["brief"]


def test_a_page_that_cannot_be_read_says_why(client, monkeypatch):
    async def refuse(url):
        raise fetchpage.FetchError("That address is on a private or internal network.")

    monkeypatch.setattr(fetchpage, "fetch", refuse)

    response = client.post("/screen", json={"url": "http://169.254.169.254/"})
    assert response.status_code == 400
    assert "private or internal" in response.json()["error"]


def test_a_request_with_neither_address_nor_text_is_rejected(client):
    assert client.post("/screen", json={}).status_code == 400


def test_text_can_still_be_supplied_directly(client):
    """Kept so a caller that already has the page does not have to be refetched."""
    assert client.post("/screen", json={"title": "X", "text": PAGE}).status_code == 200


# ── CORS ─────────────────────────────────────────────────────────────────


def _cors_options():
    from app.main import app as live

    entry = next(m for m in live.user_middleware if m.cls.__name__ == "CORSMiddleware")
    return entry.kwargs


def test_the_pattern_does_not_admit_arbitrary_websites():
    """A pattern loose enough to match a hostile site would hand the service to
    any page the user visits."""
    import re

    pattern = _cors_options().get("allow_origin_regex")
    if not pattern:
        pytest.skip("no origin pattern configured")

    for origin in (
        "https://evil.example",
        "https://chrome-extension.evil.example",
    ):
        assert not re.match(pattern, origin), origin
