"""HTTP surface of the investment-analyst service.

`POST /analyze` streams the whole pipeline as Server-Sent Events so the
frontend can draw the agent graph executing in real time. Everything else is a
plain JSON endpoint.

Layering, kept deliberately visible:

    HTTP (this file)
      -> orchestration (orchestrator.py, workflow.py, commands.py)
        -> agents (agents.py, methodologies/)
          -> tools & data (llm.py, the input bundle, the registry)
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import (
    fetchpage,
    ask as ask_module,
    custom,
    registry,
    runs,
    screen as screen_module,
    workflow as workflow_module,
)
from .agents import COMPARE
from .commands import compile_command
from .config import settings
from .graph import build_graph
from .llm import AgentError, llm
from .normalise import normalise_comparison
from .orchestrator import Orchestrator
from .schemas import AnalyzeRequest, CompareRequest
from .workflow import Workflow, WorkflowEdge, WorkflowNode, build_workflow

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("investvcs.api")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield
    await llm.aclose()


app = FastAPI(
    title="InvestVCS Investment Analyst",
    description="Autonomous multi-agent investment analysis for InvestVCS.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins(),
    # The browser extension's origin is chrome-extension://<id>, and the id
    # is assigned at install time, so it cannot be listed in advance.
    allow_origin_regex=r"^(chrome|moz)-extension://[a-zA-Z0-9-]+$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Requests ─────────────────────────────────────────────────────────────


class CustomAgentPayload(BaseModel):
    """An agent the user defined in the UI.

    It becomes a real methodology for the duration of the run: gated, planned,
    executed and criticised alongside the built-in twelve.
    """

    id: Optional[str] = None
    name: str
    purpose: str = ""
    instruction: str
    family: str = "risk"
    requiredInputs: list[str] = Field(default_factory=list)

    def to_spec(self):
        return custom.build_spec(
            agent_id=self.id,
            name=self.name,
            purpose=self.purpose,
            instruction=self.instruction,
            family=self.family,
            required_inputs=self.requiredInputs,
        )


class CommandRequest(BaseModel):
    command: str
    startup: Optional[dict[str, Any]] = None
    #: The team's own agents. The compiler has to see them, or an instruction
    #: naming one compiles to a workflow that quietly leaves it out.
    customAgents: list[CustomAgentPayload] = Field(default_factory=list)


class AskRequest(BaseModel):
    """A question about the company, with the analysis it should be answered from."""

    question: str
    #: Whatever the client currently holds: the brief, the profile, the
    #: methodology results, the thesis. Absent before a run, which is a
    #: supported case rather than an error.
    company: Optional[dict[str, Any]] = None
    #: Prior turns, so a follow-up like 'why?' has something to attach to.
    history: list[dict[str, str]] = Field(default_factory=list)


class ScreenRequest(BaseModel):
    """A company website to screen.

    Either a `url` for the service to read, which is what the web app
    sends because a browser cannot read another origin, or `text` already
    extracted by a caller that could.
    """

    url: str = ""
    title: str = ""
    text: str = ""


class ApprovalRequest(BaseModel):
    nodeId: str
    approved: bool
    note: str = ""


class WorkflowNodePayload(BaseModel):
    id: str
    label: str
    kind: str
    layer: int
    agent: Optional[str] = None
    tools: list[str] = Field(default_factory=list)
    requiresApproval: bool = False
    rationale: str = ""
    family: Optional[str] = None
    detail: str = ""


class WorkflowEdgePayload(BaseModel):
    source: str
    target: str
    kind: str = "flow"


class WorkflowPayload(BaseModel):
    """A workflow the user edited in the builder and wants executed as-is."""

    id: str = "custom"
    name: str = "Custom workflow"
    goal: str = ""
    origin: str = "user"
    strategy: str = ""
    nodes: list[WorkflowNodePayload] = Field(default_factory=list)
    edges: list[WorkflowEdgePayload] = Field(default_factory=list)

    def to_workflow(self) -> Workflow:
        return Workflow(
            id=self.id, name=self.name, goal=self.goal, origin=self.origin, strategy=self.strategy,
            nodes=[
                WorkflowNode(
                    id=node.id, label=node.label, kind=node.kind, layer=node.layer, agent=node.agent,
                    tools=node.tools, requires_approval=node.requiresApproval, rationale=node.rationale,
                    family=node.family, detail=node.detail,
                )
                for node in self.nodes
            ],
            edges=[WorkflowEdge(edge.source, edge.target, edge.kind) for edge in self.edges],
        )


class RunRequest(AnalyzeRequest):
    """`/analyze` with an optional pre-compiled or hand-edited workflow."""

    workflow: Optional[WorkflowPayload] = None
    templateId: Optional[str] = None
    #: Agents this team added. Live for this run only.
    customAgents: list[CustomAgentPayload] = Field(default_factory=list)


# ── Read endpoints ───────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "configured": settings.configured,
        "mock": settings.mock,
        # On an agent endpoint the agent is pinned to a model and this service
        # does not send one, so reporting the configured value here would name a
        # model that has no bearing on what runs. Only the deployment surface
        # actually chooses.
        "model": (
            settings.deployment
            if settings.endpoint and settings.protocol != "responses"
            else None
        ),
        "modelChosenBy": (
            "the Foundry agent" if settings.protocol == "responses" else "AZURE_AI_MODEL"
        ),
        "methodologies": len(registry.REGISTRY),
        "customAgentFamilies": custom.FAMILIES,
        "activeRuns": len(runs.active()),
    }


@app.get("/registry")
async def get_registry() -> dict:
    """The methodology registry. The frontend renders its pickers and labels
    from this, so there is one source of truth."""
    return {
        "methodologies": registry.summaries(),
        "tools": workflow_module.TOOL_LABELS,
        "methodologyTools": workflow_module.METHODOLOGY_TOOLS,
    }


@app.get("/graph")
async def get_graph() -> dict:
    """The pipeline shape, before any analysis has run."""
    return build_graph().to_dict()


@app.get("/workflows")
async def get_workflows() -> dict:
    """Saved starting points the user can run or edit."""
    return {
        "templates": [
            {**template, "workflow": workflow_module.workflow_from_template(template["id"]).to_dict()}
            for template in workflow_module.TEMPLATES
        ],
        "default": build_workflow().to_dict(),
    }


@app.get("/runs")
async def get_runs() -> dict:
    return {"runs": runs.active()}


# ── Command bar ──────────────────────────────────────────────────────────


@app.post("/command")
async def command(request: CommandRequest) -> JSONResponse:
    """Translate a natural-language instruction into an executable workflow.

    Returns the plan rather than running it, so the user sees what is about to
    happen and can edit it first.
    """
    if not request.command.strip():
        return JSONResponse({"error": "Empty command."}, status_code=400)

    # The overlay has to be held across the await: compile_command reads
    # registry.active() to tell the model which agents exist and again to
    # validate the ids it returns. Without it a custom agent is invisible to
    # both, so "run my Regulatory agent" silently compiles without it.
    #
    # Unlike /analyze this is safe to scope with a context manager, because the
    # compilation runs in this task rather than one the HTTP layer hands off.
    # Serialisation stays inside the overlay: CommandPlan.to_dict() builds the
    # workflow lazily, and build_workflow() drops any methodology the registry
    # cannot resolve. Compiling inside and serialising outside returns a plan
    # that names the agent next to a workflow that does not contain it.
    with custom.overlay([agent.to_spec() for agent in request.customAgents]):
        plan = await compile_command(request.command, {"startup": request.startup})
        payload = plan.to_dict()

    return JSONResponse(payload)


@app.post("/ask")
async def ask(request: AskRequest) -> JSONResponse:
    """Answer a question about the company under analysis.

    Read-only by construction: it cannot start a run, change a result or
    write to a session. That is what makes it safe to let it answer freely
    while the pipeline itself stays strictly structured.
    """
    question = request.question.strip()
    if not question:
        return JSONResponse({"error": "Empty question."}, status_code=400)

    if settings.mock:
        return JSONResponse(ask_module.mock_answer(question, request.company))

    return JSONResponse(
        await ask_module.answer(question, request.company, request.history)
    )


@app.post("/screen")
async def screen_page(request: ScreenRequest) -> JSONResponse:
    """Screen a company from its website.

    One model call, seconds rather than the twelve-agent minutes: enough to
    answer whether the full analysis is worth starting.

    Given a url, the service reads the page itself. It has to: a browser
    cannot read a page on another origin, so the alternative would be
    asking the user to install something, and that is the thing this
    replaces. fetchpage refuses anything not publicly routable.
    """
    url, title, text = request.url.strip(), request.title, request.text

    if not text.strip():
        if not url:
            return JSONResponse({"error": "No address was given."}, status_code=400)
        try:
            url, fetched_title, text = await fetchpage.fetch(url)
        except fetchpage.FetchError as error:
            return JSONResponse({"error": str(error)}, status_code=400)
        title = title or fetched_title

    if settings.mock:
        return JSONResponse(screen_module.mock_screen(url, title, text))

    result = await screen_module.screen(url, title, text)
    status = 502 if result.get("error") and "could not be screened" in result["error"] else 200
    if result.get("error") and status == 200:
        status = 400
    return JSONResponse(result, status_code=status)


# ── Execution ────────────────────────────────────────────────────────────


def _sse(event: dict) -> str:
    return f"event: {event['type']}\ndata: {json.dumps(event['payload'], default=str)}\n\n"


def _resolve_workflow(request: RunRequest) -> Workflow:
    if request.workflow is not None:
        return request.workflow.to_workflow()
    if request.templateId:
        from_template = workflow_module.workflow_from_template(request.templateId)
        if from_template is not None:
            return from_template
    if request.mode != "autonomous" and request.chosenMethodologyIds:
        return build_workflow(methodology_ids=request.chosenMethodologyIds, origin="user")
    return build_workflow()


@app.post("/analyze")
async def analyze(request: RunRequest) -> StreamingResponse:
    # Custom agents have to be visible while the workflow is resolved, because
    # the workflow names them. The orchestrator then carries them itself: the
    # run executes in a task the HTTP layer does not own, so a ContextVar set
    # around the streaming response would not reach it.
    custom_specs = [agent.to_spec() for agent in request.customAgents]

    with custom.overlay(custom_specs):
        orchestrator = Orchestrator(
            bundle=request.bundle,
            mode=request.mode,
            chosen_methodology_ids=request.chosenMethodologyIds,
            max_iterations=request.maxIterations,
            workflow=_resolve_workflow(request),
            custom_specs=custom_specs,
        )

    # The run is driven by the registry, not by this response. A client that
    # goes away - a backgrounded tab, a dropped connection, a navigation -
    # disconnects a reader and nothing more; the analysis carries on and can
    # be picked up again at /runs/{id}/stream.
    session = await runs.register(orchestrator)

    async def stream() -> AsyncIterator[str]:
        # An early comment frame defeats proxies that buffer until first byte.
        yield ": stream open\n\n"
        try:
            async for event in session.subscribe(0):
                yield _sse(event)
        except asyncio.CancelledError:
            log.info("client disconnected, run continues (%s)", session.run_id)
            raise

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/runs/{run_id}/stream")
async def stream_run(run_id: str, request: Request):
    """Reattach to a run already in progress.

    `from` is how many events the client already holds, so a reconnecting
    browser replays what it missed and nothing it has drawn already. A
    finished run stays replayable for a while, which is what turns a drop
    near the end from fatal into an inconvenience.
    """
    session = runs.session(run_id)
    if session is None:
        return JSONResponse({"error": "Unknown or expired run."}, status_code=404)

    try:
        start_at = int(request.query_params.get("from", "0"))
    except ValueError:
        start_at = 0

    async def stream() -> AsyncIterator[str]:
        yield ": stream open\n\n"
        async for event in session.subscribe(start_at):
            yield _sse(event)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.delete("/runs/{run_id}")
async def cancel_run(run_id: str) -> JSONResponse:
    """Stop a run for good.

    Disconnecting no longer does this, so abandoning an analysis has to be
    something the user actually asks for.
    """
    if runs.session(run_id) is None:
        return JSONResponse({"error": "Unknown or expired run."}, status_code=404)
    await runs.release(run_id)
    return JSONResponse({"cancelled": True})


@app.post("/runs/{run_id}/approve")
async def approve(run_id: str, request: ApprovalRequest) -> JSONResponse:
    """Resume a run paused at a human checkpoint."""
    orchestrator = runs.get(run_id)
    if orchestrator is None:
        return JSONResponse(
            {"error": "That run is not active on this instance. It may have finished or timed out."},
            status_code=404,
        )

    if not orchestrator.resolve_approval(request.nodeId, request.approved, request.note):
        return JSONResponse(
            {"error": f"No approval is pending for {request.nodeId}."},
            status_code=409,
        )

    return JSONResponse({"ok": True, "runId": run_id, "nodeId": request.nodeId, "approved": request.approved})


@app.post("/compare")
async def compare(request: CompareRequest) -> JSONResponse:
    try:
        response = await llm.run(
            role=COMPARE.role,
            instruction=COMPARE.instruction,
            schema=COMPARE.schema,
            context={"startupA": request.a, "startupB": request.b},
            label=f"{request.a.get('name', 'A')} vs {request.b.get('name', 'B')}",
        )
    except AgentError as error:
        return JSONResponse({"error": str(error)}, status_code=429 if error.status == 429 else 502)

    return JSONResponse(normalise_comparison(response.output))
