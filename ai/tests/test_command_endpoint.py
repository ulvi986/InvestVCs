"""The /command endpoint, at the HTTP boundary.

The unit tests around `fallback_plan` prove the router can find a custom agent
once the overlay is set. This file proves the endpoint actually sets it, which
is a separate risk: the overlay is a ContextVar and has to survive the `await`
inside the handler. It did not survive the equivalent hand-off in /analyze, and
that bug shipped, so it is worth pinning here rather than assuming.
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from app.config import settings
from app.main import app

AGENT = {
    "id": "custom_regulatory_exposure",
    "name": "Regulatory Exposure",
    "purpose": "Whether this company needs a licence it does not have.",
    "instruction": "Identify every licence this business model requires and whether the company holds it.",
    "family": "risk",
    "requiredInputs": [],
}


@pytest.fixture
def client(monkeypatch):
    # Force the deterministic path: this test is about whether the endpoint
    # makes the agent visible, not about what a model would choose. Settings is
    # a frozen dataclass, so the property is patched on the class, as in
    # test_llm_protocol.
    monkeypatch.setattr(settings.__class__, "mock", property(lambda _self: True))
    with TestClient(app) as test_client:
        yield test_client


def test_an_instruction_naming_your_agent_compiles_it_into_the_workflow(client):
    response = client.post("/command", json={
        "command": "run the Regulatory Exposure agent on this company",
        "startup": {"name": "Northwind Labs"},
        "customAgents": [AGENT],
    })

    assert response.status_code == 200
    plan = response.json()

    assert AGENT["id"] in plan["methodologyIds"]

    agents = {node.get("agent") for node in plan["workflow"]["nodes"]}
    assert AGENT["id"] in agents, "the agent was planned but never made it into the workflow"


def test_the_node_carries_the_name_the_user_typed(client):
    response = client.post("/command", json={
        "command": "run the Regulatory Exposure agent",
        "customAgents": [AGENT],
    })

    node = next(n for n in response.json()["workflow"]["nodes"] if n.get("agent") == AGENT["id"])
    assert node["label"] == "Regulatory Exposure"


def test_the_same_instruction_without_the_agent_does_not_invent_it(client):
    """No overlay, no agent: the endpoint must not leak one request's agents
    into another's."""
    response = client.post("/command", json={
        "command": "run the Regulatory Exposure agent on this company",
        "customAgents": [],
    })

    assert response.status_code == 200
    plan = response.json()
    assert AGENT["id"] not in plan["methodologyIds"]
    assert AGENT["id"] not in {node.get("agent") for node in plan["workflow"]["nodes"]}


def test_custom_agents_are_optional(client):
    """The field is new, so an older client that omits it must still work."""
    response = client.post("/command", json={"command": "value this company with berkus"})
    assert response.status_code == 200
    assert "berkus" in response.json()["methodologyIds"]


def test_an_empty_command_is_still_rejected(client):
    assert client.post("/command", json={"command": "  ", "customAgents": [AGENT]}).status_code == 400


def test_the_built_ins_still_reach_the_workflow_alongside_a_custom_agent(client):
    response = client.post("/command", json={
        "command": "value this company with berkus",
        "customAgents": [AGENT],
    })
    assert "berkus" in response.json()["methodologyIds"]
