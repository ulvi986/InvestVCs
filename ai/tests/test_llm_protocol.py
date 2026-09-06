"""Wire-protocol regression tests.

The deployed service was returning 404/403/400 on every model call because it
spoke Azure OpenAI chat-completions to an Azure AI Foundry agent endpoint,
which is a different surface. These tests pin the three things that were
wrong: the URL, the auth header, and the request and reply shapes.

They are pure unit tests over config and payload construction, so they run
without credentials and without network.
"""

from __future__ import annotations

import importlib
from types import SimpleNamespace

import pytest

FOUNDRY = (
    "https://example-resource.services.ai.azure.com/api/projects/proj"
    "/agents/myagent/endpoint/protocols/openai/responses"
)
AZURE_OPENAI = "https://example-resource.openai.azure.com"


def _settings(monkeypatch, **env):
    """Rebuild Settings from a clean environment."""
    for key in [
        "AZURE_OPENAI_ENDPOINT", "AZURE_AI_FOUNDRY_ENDPOINT",
        "AZURE_OPENAI_API_KEY", "AZURE_AI_API_KEY",
        "AZURE_OPENAI_DEPLOYMENT", "AZURE_AI_MODEL",
        "AZURE_OPENAI_API_VERSION", "AI_PROTOCOL", "AI_MOCK", "MOCK",
    ]:
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    from app import config as config_module

    importlib.reload(config_module)
    return config_module.Settings()


# ── Protocol detection ───────────────────────────────────────────────────


def test_foundry_agent_endpoint_selects_the_responses_protocol(monkeypatch):
    settings = _settings(monkeypatch, AZURE_AI_FOUNDRY_ENDPOINT=FOUNDRY)
    assert settings.protocol == "responses"


def test_azure_openai_endpoint_still_selects_chat(monkeypatch):
    settings = _settings(monkeypatch, AZURE_OPENAI_ENDPOINT=AZURE_OPENAI)
    assert settings.protocol == "chat"


def test_protocol_can_be_forced(monkeypatch):
    settings = _settings(monkeypatch, AZURE_AI_FOUNDRY_ENDPOINT=FOUNDRY, AI_PROTOCOL="chat")
    assert settings.protocol == "chat"


# ── URL construction ─────────────────────────────────────────────────────


def test_foundry_url_is_the_endpoint_plus_api_version(monkeypatch):
    settings = _settings(
        monkeypatch, AZURE_AI_FOUNDRY_ENDPOINT=FOUNDRY, AZURE_OPENAI_API_VERSION="2025-11-15-preview",
    )
    # The endpoint is already complete. Appending a deployment path to it was
    # the original 404.
    assert settings.chat_url == f"{FOUNDRY}?api-version=2025-11-15-preview"
    assert "/openai/deployments/" not in settings.chat_url


def test_foundry_url_does_not_double_up_api_version(monkeypatch):
    settings = _settings(monkeypatch, AZURE_AI_FOUNDRY_ENDPOINT=f"{FOUNDRY}?api-version=x")
    assert settings.chat_url.count("api-version=") == 1


def test_azure_openai_url_keeps_the_deployment_path(monkeypatch):
    settings = _settings(
        monkeypatch,
        AZURE_OPENAI_ENDPOINT=AZURE_OPENAI,
        AZURE_OPENAI_DEPLOYMENT="gpt-4o",
        AZURE_OPENAI_API_VERSION="2024-10-21",
    )
    assert settings.chat_url == (
        f"{AZURE_OPENAI}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21"
    )


# ── Authentication ───────────────────────────────────────────────────────


@pytest.mark.parametrize("endpoint_var,endpoint", [
    ("AZURE_AI_FOUNDRY_ENDPOINT", FOUNDRY),
    ("AZURE_OPENAI_ENDPOINT", AZURE_OPENAI),
])
def test_azure_surfaces_authenticate_with_api_key(monkeypatch, endpoint_var, endpoint):
    settings = _settings(monkeypatch, **{endpoint_var: endpoint, "AZURE_AI_API_KEY": "secret"})
    # Foundry rejects a bearer token with 403.
    assert settings.auth_headers["api-key"] == "secret"
    assert "Authorization" not in settings.auth_headers


def test_non_azure_proxy_uses_a_bearer_token(monkeypatch):
    settings = _settings(
        monkeypatch, AZURE_OPENAI_ENDPOINT="https://proxy.example/v1/chat/completions",
        AZURE_AI_API_KEY="secret",
    )
    assert settings.auth_headers["Authorization"] == "Bearer secret"


# ── Request and reply shapes ─────────────────────────────────────────────


def test_responses_payload_folds_system_into_the_first_user_turn():
    from app.llm import LLMClient

    payload = LLMClient._responses_payload([
        {"role": "system", "content": "SYS"},
        {"role": "user", "content": "USER"},
    ])

    # The agent surface accepts only user and assistant roles.
    assert [turn["role"] for turn in payload["input"]] == ["user"]
    assert payload["input"][0]["content"] == "SYS\n\nUSER"

    # And rejects these outright when an agent is specified.
    assert "temperature" not in payload
    assert "text" not in payload
    assert "instructions" not in payload
    assert "messages" not in payload


def test_responses_payload_keeps_the_repair_round_intact():
    from app.llm import LLMClient

    payload = LLMClient._responses_payload([
        {"role": "system", "content": "SYS"},
        {"role": "user", "content": "USER"},
        {"role": "assistant", "content": "bad json"},
        {"role": "user", "content": "try again"},
    ])
    assert [turn["role"] for turn in payload["input"]] == ["user", "assistant", "user"]


def test_responses_payload_handles_a_system_only_conversation():
    from app.llm import LLMClient

    payload = LLMClient._responses_payload([{"role": "system", "content": "SYS"}])
    assert payload["input"] == [{"role": "user", "content": "SYS"}]


def test_responses_content_skips_reasoning_items():
    from app.llm import LLMClient

    # The real reply carries a reasoning item first and a null output_text.
    data = {
        "output_text": None,
        "output": [
            {"type": "reasoning", "summary": []},
            {"type": "message", "content": [{"type": "output_text", "text": '{"ok": true}'}]},
        ],
    }
    assert LLMClient._responses_content(data) == '{"ok": true}'


def test_responses_content_prefers_output_text_when_present():
    from app.llm import LLMClient

    assert LLMClient._responses_content({"output_text": '{"a": 1}'}) == '{"a": 1}'


def test_responses_content_is_empty_when_there_is_no_message():
    from app.llm import LLMClient

    assert LLMClient._responses_content({"output": [{"type": "reasoning"}]}) == ""


# ── Truncation ───────────────────────────────────────────────────────────


def test_incomplete_response_reports_the_output_limit(monkeypatch):
    """A truncated reply is a 200 with a short body, not a parse failure."""
    import asyncio

    from app import llm as llm_module

    class _Response:
        status_code = 200
        text = ""

        @staticmethod
        def json():
            return {
                "status": "incomplete",
                "incomplete_details": {"reason": "max_output_tokens"},
                "output": [{"type": "message", "content": [{"type": "output_text", "text": '{"a"'}]}],
            }

    class _Client:
        async def post(self, *_args, **_kwargs):
            return _Response()

    monkeypatch.setattr(llm_module.settings.__class__, "protocol", property(lambda _self: "responses"))
    client = llm_module.LLMClient()
    monkeypatch.setattr(client, "_http", lambda: asyncio.sleep(0, result=_Client()))

    with pytest.raises(llm_module.AgentError) as caught:
        asyncio.run(client._call([{"role": "user", "content": "x"}], 0.2))

    assert "output limit" in str(caught.value)
    assert caught.value.retryable is True


# ── Rate limits ──────────────────────────────────────────────────────────


def test_retry_after_header_is_honoured():
    """A real run failed an agent because the client retried sooner than the
    deployment's own Retry-After, spending quota that was already gone."""
    from app.llm import _MAX_BACKOFF, _retry_after_seconds

    assert _retry_after_seconds({"retry-after": "12"}) == 12.0
    assert _retry_after_seconds({"retry-after": "12s"}) == 12.0
    assert _retry_after_seconds({"x-ratelimit-reset-requests": "5"}) == 5.0

    # Absent, unparseable, or beyond the cap: fall back to our own backoff.
    assert _retry_after_seconds({}) is None
    assert _retry_after_seconds({"retry-after": "soon"}) is None
    assert _retry_after_seconds({"retry-after": str(_MAX_BACKOFF + 10)}) is None
    assert _retry_after_seconds({"retry-after": "0"}) is None


def test_a_rate_limit_error_carries_the_wait():
    from app.llm import AgentError

    error = AgentError("Rate limit reached.", retryable=True, status=429, retry_after=9.0)
    assert error.retryable is True
    assert error.status == 429
    assert error.retry_after == 9.0


def test_a_plain_error_has_no_wait():
    from app.llm import AgentError

    assert AgentError("boom").retry_after is None


# ── Who chooses the model ────────────────────────────────────────────────
#
# The Foundry endpoint addresses an agent, and the agent is pinned to a model.
# Naming a different one is rejected outright - "Model must match the agent's
# model" - so sending it could only agree with the agent or break the run. It
# broke the run twice: once at setup, and again when the agent's model was
# changed in Foundry without AZURE_AI_MODEL being changed to match.


def test_the_agent_surface_does_not_name_a_model():
    """Whatever the agent is pinned to is what runs. Changing it in Foundry
    must not require a redeploy here."""
    from app.llm import LLMClient

    payload = LLMClient._responses_payload([{"role": "user", "content": "hello"}])
    assert "model" not in payload


def test_the_agent_surface_still_sends_what_it_must():
    from app.llm import LLMClient

    payload = LLMClient._responses_payload([{"role": "user", "content": "hello"}])
    assert payload["input"]
    assert payload["max_output_tokens"] > 0


def test_a_misconfigured_model_name_cannot_break_the_agent_surface(monkeypatch):
    """AZURE_AI_MODEL is irrelevant here, so setting it wrongly is harmless."""
    import app.llm as llm_module
    from app.llm import LLMClient

    stand_in = SimpleNamespace(deployment="gpt-6-astra", max_output_tokens=4096)
    monkeypatch.setattr(llm_module, "settings", stand_in)

    payload = LLMClient._responses_payload([{"role": "user", "content": "hello"}])
    assert "gpt-6-astra" not in str(payload)
    assert "model" not in payload


def test_the_plain_deployment_surface_still_needs_the_model(monkeypatch):
    """On a bare Azure OpenAI resource there is no agent to ask, so the
    deployment name is still how the model is chosen. It stays in the URL."""
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://res.openai.azure.com")
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
    monkeypatch.delenv("AZURE_AI_FOUNDRY_ENDPOINT", raising=False)
    monkeypatch.delenv("AI_PROTOCOL", raising=False)

    from app.config import Settings

    fresh = Settings()
    assert fresh.protocol == "chat"
    assert "/deployments/gpt-4o/" in fresh.chat_url
