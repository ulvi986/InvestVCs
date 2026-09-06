"""Screening a company from its website.

The screener is the one surface that reads text nobody vetted, from a site
nobody controls, so the things worth pinning are the boundaries: it refuses a
page with nothing on it, it hands the full analysis the source rather than only
its own summary, and a brief that is never collected expires instead of
accumulating.
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

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


@pytest.fixture(autouse=True)
def clean_briefs():
    screen_module.briefs._items.clear()
    yield
    screen_module.briefs._items.clear()


@pytest.fixture
def screened(monkeypatch):
    async def reply(**_kwargs):
        return AgentResponse(output=dict(SCREEN_OUTPUT), duration_ms=5, model="harness")

    monkeypatch.setattr(llm, "run", reply)


# ── Refusing what it cannot screen ───────────────────────────────────────


async def test_a_page_with_almost_no_text_is_refused():
    result = await screen_module.screen("https://example.com", "Example", "Hello.")
    assert "error" in result
    assert "too little text" in result["error"]


async def test_an_unreachable_model_is_reported_rather_than_guessed_at(monkeypatch):
    async def boom(**_kwargs):
        raise AgentError("Rate limit reached.")

    monkeypatch.setattr(llm, "run", boom)
    result = await screen_module.screen("https://example.com", "Example", PAGE)
    assert "could not be screened" in result["error"]


# ── What it returns ──────────────────────────────────────────────────────


async def test_a_screen_returns_the_reading_and_a_collectable_brief(screened):
    result = await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE)

    assert result["company"] == "Northwind Labs"
    assert result["worthFullAnalysis"] is True
    assert result["url"] == "https://northwind.example"
    assert result["briefId"]


async def test_the_brief_carries_the_page_itself_not_only_the_summary(screened):
    """The agents should read the source. A summary of a summary loses exactly
    the specifics the analysis is for."""
    result = await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE)
    brief = screen_module.briefs.get(result["briefId"])

    assert brief["startupName"] == "Northwind Labs"
    assert "DSV" in brief["narrative"], "the page text did not reach the brief"
    assert "Names DSV and Girteka as customers" in brief["narrative"]
    assert brief["sourceUrl"] == "https://northwind.example"


async def test_the_brief_says_the_page_is_marketing_copy(screened):
    """The agents weigh evidence by how it was known, so where this came from
    has to travel with it."""
    result = await screen_module.screen("https://northwind.example", "Northwind Labs", PAGE)
    narrative = screen_module.briefs.get(result["briefId"])["narrative"]
    assert "marketing copy" in narrative
    assert "https://northwind.example" in narrative


async def test_an_enormous_page_is_truncated_before_it_reaches_the_model(monkeypatch):
    captured = {}

    async def capture(**kwargs):
        captured["chars"] = len(kwargs["context"]["pageText"])
        return AgentResponse(output=dict(SCREEN_OUTPUT), duration_ms=1, model="harness")

    monkeypatch.setattr(llm, "run", capture)
    await screen_module.screen("https://example.com", "Big", "word " * 200_000)

    assert captured["chars"] <= screen_module.MAX_PAGE_CHARS


# ── The brief store ──────────────────────────────────────────────────────


def test_an_unknown_brief_is_not_invented():
    assert screen_module.briefs.get("nope") is None


def test_a_brief_expires_rather_than_accumulating(monkeypatch):
    key = screen_module.briefs.put({"startupName": "X", "narrative": "y", "sourceUrl": "z"})
    assert screen_module.briefs.get(key) is not None

    at, brief = screen_module.briefs._items[key]
    screen_module.briefs._items[key] = (at - screen_module.BRIEF_TTL_SECONDS - 1, brief)

    assert screen_module.briefs.get(key) is None


# ── The endpoints ────────────────────────────────────────────────────────


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings.__class__, "mock", property(lambda _self: True))
    with TestClient(app) as test_client:
        yield test_client


def test_the_endpoint_screens_a_page(client):
    response = client.post("/screen", json={"url": "https://x.example", "title": "X", "text": PAGE})
    assert response.status_code == 200
    assert response.json()["briefId"]


def test_an_empty_page_is_rejected(client):
    assert client.post("/screen", json={"text": "   "}).status_code == 400


def test_a_screened_brief_can_be_collected(client):
    brief_id = client.post("/screen", json={"title": "X", "text": PAGE}).json()["briefId"]
    collected = client.get(f"/screen/{brief_id}")

    assert collected.status_code == 200
    assert collected.json()["narrative"]


def test_collecting_an_expired_brief_says_so(client):
    assert client.get("/screen/does-not-exist").status_code == 404


def _cors_options():
    """The CORS settings the app was actually built with."""
    from app.main import app
    entry = next(m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware")
    return entry.kwargs


def test_the_extension_origin_is_matched_by_pattern():
    """The extension's origin is chrome-extension://<id>, and the id is assigned
    at install time, so it cannot be listed in CORS_ORIGINS in advance.

    Asserted against the configured pattern rather than a request, because the
    test environment leaves CORS_ORIGINS at "*", which would let anything
    through and prove nothing.
    """
    import re

    pattern = _cors_options().get("allow_origin_regex")
    assert pattern, "no origin pattern configured"

    assert re.match(pattern, "chrome-extension://abcdefghijklmnopabcdefghijklmnop")
    assert re.match(pattern, "moz-extension://0f9a1b2c-3d4e-5f60-7182-93a4b5c6d7e8")


def test_the_pattern_does_not_admit_arbitrary_websites():
    """A pattern loose enough to match a hostile site would hand the service to
    any page the user visits."""
    import re

    pattern = _cors_options()["allow_origin_regex"]

    for origin in (
        "https://evil.example",
        "http://chrome-extension://abc",
        "https://chrome-extension.evil.example",
        "chrome-extension://abc/../../evil",
    ):
        assert not re.match(pattern, origin), origin
