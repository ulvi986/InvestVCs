"""What Azure will actually run, and why it might not.

Three separate outages in this project all looked the same from the outside -
"the model does not work" - and all three had different causes that only the
Azure side could tell you:

  1. AZURE_AI_MODEL naming a model the agent was not pinned to (400).
  2. An agent carrying a tool its model does not support (400).
  3. An agent naming a model that has no deployment behind it (500).

An agent definition takes the model as a string, so none of these are visible
in Foundry's agent list. This prints the three things together and says which
agents can actually serve a request.

    python ai/scripts/check_azure.py
"""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402

from app.config import settings  # noqa: E402

#: Tool/model pairs Azure is known to reject, keyed by model prefix. Kept
#: narrow on purpose: other models carrying web_search were verified working
#: through this same surface, so a blanket rule about the tool would be wrong
#: and would report healthy agents as broken.
UNSUPPORTED_TOOLS = {
    "gpt-6-astra": {"web_search": "gpt-6-astra rejects web_search (400)"},
}


def _project() -> tuple[str, str, str]:
    endpoint = settings.endpoint or ""
    root = re.sub(r"/api/projects/.*$", "", endpoint)
    project = re.search(r"/api/projects/([^/]+)/", endpoint)
    agent = re.search(r"/agents/([^/]+)/", endpoint)
    return root, (project.group(1) if project else ""), (agent.group(1) if agent else "")


async def _get(client: httpx.AsyncClient, url: str):
    response = await client.get(url, headers={"api-key": settings.api_key})
    response.raise_for_status()
    data = response.json()
    return data if isinstance(data, list) else (data.get("value") or data.get("data") or [])


async def main() -> int:
    root, project, current = _project()
    if not root or not project:
        print("AZURE_AI_FOUNDRY_ENDPOINT is not a Foundry agent endpoint; nothing to check.")
        return 0

    version = settings.api_version
    async with httpx.AsyncClient(timeout=60) as client:
        agents = await _get(client, f"{root}/api/projects/{project}/agents?api-version={version}")
        deployments = await _get(client, f"{root}/api/projects/{project}/deployments?api-version={version}")

    deployed = {}
    print("DEPLOYMENTS  (a model with no deployment cannot serve anything)")
    print(f"  {'name':<34} {'model':<44} capacity")
    for item in deployments:
        model = str(item.get("modelName", ""))
        deployed[model] = item
        deployed[str(item.get("name", ""))] = item
        print(f"  {str(item.get('name','')):<34} {model[:42]:<44} {(item.get('sku') or {}).get('capacity')}")

    print()
    print("AGENTS")
    print(f"  {'agent':<34} {'model':<18} {'usable':<8} why not")
    problems = 0
    for agent in agents:
        if not isinstance(agent, dict):
            continue
        definition = (agent.get("versions") or {}).get("latest", {}).get("definition") or {}
        model = str(definition.get("model", ""))
        tools = [tool.get("type") for tool in (definition.get("tools") or [])]

        reasons = []
        if model not in deployed:
            reasons.append(f"'{model}' has no deployment")
        for prefix, rejected in UNSUPPORTED_TOOLS.items():
            if not model.startswith(prefix):
                continue
            for tool in tools:
                if tool in rejected:
                    reasons.append(rejected[tool])

        marker = "<-- in use" if agent.get("id") == current else ""
        usable = "yes" if not reasons else "NO"
        if reasons:
            problems += 1
        print(f"  {str(agent.get('id','')):<34} {model:<18} {usable:<8} {'; '.join(reasons)} {marker}".rstrip())

    print()
    print(f"endpoint points at: {current or '(none)'}")
    print(f"agents that cannot serve a request: {problems}")
    print()
    print("To switch model, point AZURE_AI_FOUNDRY_ENDPOINT at another agent:")
    print(f"  {root}/api/projects/{project}/agents/<AGENT>/endpoint/protocols/openai/responses")
    print("The service sends no model name, so the agent's own model is what runs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
