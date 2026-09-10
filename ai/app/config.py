"""Runtime configuration.

Reads the same AZURE_OPENAI_* variables the existing Supabase edge functions
use, so a deployment that already works keeps working with no new secrets.

Three surfaces are supported, and the endpoint decides which:

  Azure deployment   https://<resource>.services.ai.azure.com  - chat
                     completions under /openai/deployments/<name>. The
                     deployment name chooses the model.
  Azure AI Foundry   an agent URL ending in /responses. The agent is
                     pinned to its own model and we send none.
  OpenAI             https://api.openai.com/v1 - chat completions at
                     the root, a bearer token, and no api-version.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _load_env_files() -> None:
    """Read `.env` from the repo root and from `ai/`, without overriding the
    real environment.

    The service is started from several places — `npm run dev:all`, `uvicorn`
    by hand, Railway — and only the deployment sets variables properly. Reading
    the file the frontend already uses means the credentials live in one place
    and the service works however it is launched. Values already present in the
    environment always win, so a deployment is never overridden by a stray file.

    Deliberately hand-rolled: pulling in python-dotenv for twenty lines would
    add a dependency to every deployment for a local convenience.
    """
    here = Path(__file__).resolve()
    candidates = [here.parents[2] / ".env", here.parents[1] / ".env"]

    for path in candidates:
        try:
            if not path.is_file():
                continue
            for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                if not key or key in os.environ:
                    continue
                value = value.strip()
                # Strip one layer of matching quotes, as shells would.
                if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                    value = value[1:-1]
                os.environ[key] = value
        except OSError:
            # An unreadable file is not worth failing startup over; the
            # environment may well carry everything already.
            continue


_load_env_files()


def _env(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value.strip()
    return default


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "") or default)
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    #: Azure spellings come first because that is what the existing
    #: deployments set; OPENAI_BASE_URL is what an OpenAI-only deployment
    #: would naturally use, and defaults to OpenAI's own host once a key is
    #: present, so pointing at OpenAI takes one variable rather than two.
    endpoint: str = field(
        default_factory=lambda: _env(
            "AZURE_OPENAI_ENDPOINT", "AZURE_AI_FOUNDRY_ENDPOINT", "OPENAI_BASE_URL",
            default=("https://api.openai.com/v1" if os.getenv("OPENAI_API_KEY") else ""),
        )
    )
    #: The default has to be valid on both surfaces, because it is what
    #: applies when nobody named a model. gpt-5-mini is a real OpenAI model
    #: id and also a deployment in the Azure resource, so neither surface
    #: 400s on it. Deployments name gpt-5-mini-2 explicitly - the same model
    #: on a hundred times the quota - so this default is a floor, not the
    #: intended configuration.
    deployment: str = field(
        default_factory=lambda: _env(
            "AZURE_OPENAI_DEPLOYMENT", "AZURE_AI_MODEL", "OPENAI_MODEL", default="gpt-5-mini",
        )
    )
    api_version: str = field(default_factory=lambda: _env("AZURE_OPENAI_API_VERSION", default="2024-10-21"))
    api_key: str = field(
        default_factory=lambda: _env("AZURE_OPENAI_API_KEY", "AZURE_AI_API_KEY", "OPENAI_API_KEY")
    )

    request_timeout: float = field(default_factory=lambda: _float_env("LLM_TIMEOUT_SECONDS", 120.0))
    #: On the Responses surface a reasoning model spends part of this budget
    #: thinking, so the headroom has to cover reasoning plus the JSON answer.
    #: 4096 truncated the longer methodologies mid-object.
    max_output_tokens: int = field(default_factory=lambda: _int_env("LLM_MAX_OUTPUT_TOKENS", 16384))
    max_attempts: int = field(default_factory=lambda: _int_env("LLM_MAX_ATTEMPTS", 3))

    #: How many methodology agents may be in flight at once. Kept modest on
    #: purpose: a small model deployment's rate limit, not the orchestrator, is
    #: what caps throughput, and exceeding it fails agents rather than speeding
    #: the run up. Raise it if your deployment has the quota.
    concurrency: int = field(default_factory=lambda: _int_env("AGENT_CONCURRENCY", 3))
    #: Critic -> revise -> re-analyse rounds allowed.
    max_iterations: int = field(default_factory=lambda: _int_env("AGENT_MAX_ITERATIONS", 2))

    #: Comma-separated origins; "*" in development.
    cors_origins: str = field(default_factory=lambda: _env("CORS_ORIGINS", default="*"))

    #: Returns canned agent output instead of calling the model.
    #:
    #: Three states, because "use the real model" should be the default
    #: whenever that is actually possible:
    #:   AI_MOCK=1  force canned output (CI, UI work, no credentials)
    #:   AI_MOCK=0  force the real model, and fail loudly if unconfigured
    #:   unset      real model when an endpoint is configured, canned otherwise
    mock_override: str = field(default_factory=lambda: _env("AI_MOCK", "MOCK").lower())

    #: Wire protocol to speak. "chat" is Azure OpenAI / OpenAI-compatible
    #: chat completions. "responses" is the Azure AI Foundry agent Responses
    #: API, which is a different surface with a different request and reply
    #: shape. Auto-detected from the endpoint unless AI_PROTOCOL is set.
    protocol_override: str = field(default_factory=lambda: _env("AI_PROTOCOL").lower())

    @property
    def mock(self) -> bool:
        if self.mock_override in {"1", "true", "yes"}:
            return True
        if self.mock_override in {"0", "false", "no"}:
            return False
        # Unset: use the real model if we can, canned output if we cannot.
        return not bool(self.endpoint)

    @property
    def configured(self) -> bool:
        return bool(self.endpoint) or self.mock

    @property
    def protocol(self) -> str:
        if self.protocol_override in {"chat", "responses"}:
            return self.protocol_override
        base = self.endpoint.rstrip("/")
        # A Foundry agent endpoint ends at /responses, or is addressed through
        # the project's /protocols/openai surface.
        if base.endswith("/responses") or "/agents/" in base:
            return "responses"
        return "chat"

    @property
    def is_azure(self) -> bool:
        """Whether the endpoint is an Azure surface.

        Two things hang off this and they must not disagree: how the URL is
        built and how the request is authenticated. Azure wants an api-key
        header and its deployment path; OpenAI wants a bearer token and
        /chat/completions at the root. Mixing them gives a 401 or a 404 with
        nothing in the message pointing at the cause.
        """
        return ".azure.com" in self.endpoint

    @property
    def chat_url(self) -> str:
        """The URL to POST a completion to, for whichever protocol applies."""
        base = self.endpoint.rstrip("/")

        if self.protocol == "responses":
            # The Foundry endpoint is already complete; it only needs the
            # api-version, which the service rejects the request without.
            if "api-version=" in base:
                return base
            separator = "&" if "?" in base else "?"
            return f"{base}{separator}api-version={self.api_version}"

        if "/chat/completions" in base:
            return base

        # OpenAI's own API: the path is fixed, the model travels in the body,
        # and there is no api-version - sending one is simply ignored, but
        # the deployment path it belongs to would 404.
        if not self.is_azure:
            return f"{base}/chat/completions"

        return f"{base}/openai/deployments/{self.deployment}/chat/completions?api-version={self.api_version}"

    @property
    def auth_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if not self.api_key:
            return headers
        # Every Azure surface authenticates with `api-key`, including AI
        # Foundry on services.ai.azure.com. OpenAI and OpenAI-compatible
        # proxies use a bearer token. Getting this wrong is a 401, not a
        # helpful error.
        if self.is_azure:
            headers["api-key"] = self.api_key
        else:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def origins(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


settings = Settings()
