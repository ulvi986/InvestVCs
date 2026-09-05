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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import custom, registry, runs, workflow as workflow_module
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
        "model": settings.deployment if settings.endpoint else None,
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

    async def stream() -> AsyncIterator[str]:
        await runs.register(orchestrator)
        # An early comment frame defeats proxies that buffer until first byte.
        yield ": stream open\n\n"
        try:
            async for event in orchestrator.stream():
                yield _sse(event)
        except asyncio.CancelledError:
            log.info("client disconnected mid-analysis (run %s)", orchestrator.run_id)
            raise
        except Exception as error:  # noqa: BLE001 - the stream must always close cleanly
            log.exception("analysis stream failed")
            yield _sse({"type": "error", "payload": {"message": str(error) or "Analysis failed."}})
        finally:
            await runs.release(orchestrator.run_id)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
