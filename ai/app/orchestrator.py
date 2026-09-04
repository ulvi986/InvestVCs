"""The investment analysis orchestrator.

Drives the whole graph:

    understand -> gate + plan -> methodology waves (parallel)
      -> detect disagreements -> critic -> [revise loop] -> reconcile -> synthesise

Design notes worth knowing before changing this file:

* Nothing here is hardcoded to a methodology id. Everything comes from the
  registry, so a new methodology is one spec module and one registry line.
* Every stage emits graph events, so the frontend can render the pipeline
  executing rather than a progress bar.
* One methodology failing must never end the analysis. Degradations are
  collected and reported in the final thesis instead of being swallowed.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Optional

from . import custom, registry
from .agents import CORE_AGENTS
from .confidence import methodology_confidence, overall_confidence
from .config import settings
from .graph import AgentGraph, graph_for, methodology_node_id
from .workflow import Workflow, build_workflow
from .llm import AgentError, llm
from .methodologies.base import ComputeContext, MethodologySpec
from .normalise import (
    as_recommendation, balance_scenarios, clamp, normalise_critique, normalise_evidence,
    normalise_gaps, normalise_profile, normalise_risks, normalise_scenario, normalise_sections,
    number, strings, text,
)
from .reconcile import ValuationSpread, analyse_valuation_spread, detect_disagreements, finalise
from .schemas import (
    AnalysisPlan, Critique, Disagreement, IncompleteEntry, InputBundle, InvestmentThesis,
    MethodologyResult, PerMethodologyValuation, ReconciledValuation, SelectionExplanation,
    StartupProfile, ValuationSummary,
)
from .selection import build_manual_plan, build_plan, gate_methodologies

log = logging.getLogger("investvcs.orchestrator")

MAX_DECK_CHARS = 45_000
MAX_NARRATIVE_CHARS = 12_000

#: Key under which the UI passes a user's challenge into the bundle.
USER_CHALLENGE_KEY = "user_challenge_to_the_conclusion"


def _truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return f"{value[:limit]}\n\n[...truncated, {len(value) - limit} more characters...]"


def digest_bundle(bundle: InputBundle) -> dict[str, Any]:
    """Compact view of the raw inputs. Full text only where an agent needs it."""
    manual = bundle.manual

    def answered(values: list[Optional[float]]) -> int:
        return len([value for value in (values or []) if value is not None])

    return {
        "startupName": bundle.startupName,
        "narrative": _truncate(bundle.narrative or "", MAX_NARRATIVE_CHARS),
        "pitchDeck": (
            {"fileName": bundle.pitchDeckFileName, "text": _truncate(bundle.pitchDeckText, MAX_DECK_CHARS)}
            if bundle.pitchDeckText else None
        ),
        "businessModelCanvas": bundle.bmc or None,
        "financialSnapshot": bundle.financialSnapshot,
        "financialHistoryCount": len(bundle.financialHistory or []),
        "founderSuppliedAnswers": {
            "berkusComponentsAnswered": answered(manual.berkusAnswers),
            "scorecardFactorsAnswered": answered(manual.scorecardAnswers),
            "scorecardMedianUsd": manual.scorecardMedian,
            "riskFactorsAnswered": answered(manual.riskAnswers),
            "vcInputs": manual.vcAnswers,
            "firstChicagoInputs": manual.chicagoAnswers,
            "readinessChecklistsCompleted": {
                "trl": bool(manual.trlAnswers),
                "crl": bool(manual.crlAnswers),
                "frl": bool(manual.frlAnswers),
            },
        },
        "userCorrections": bundle.corrections or None,
        "answersToPreviousQuestions": bundle.gapAnswers or None,
    }


def summarise_result(result: MethodologyResult) -> dict[str, Any]:
    """Trim a methodology result to what a later agent actually needs."""
    return {
        "methodologyId": result.methodologyId,
        "name": result.name,
        "status": result.status,
        "headline": result.headline,
        "valuation": result.valuation.model_dump() if result.valuation else None,
        "score10": result.score10,
        "confidence": result.confidence,
        "reasoning": result.reasoning,
        "assumptions": result.assumptions,
        "limitations": result.limitations,
        "missingInputs": result.missingInputs,
        "keyInputs": result.inputs,
        "computed": result.computed,
        "risks": [{"title": risk.title, "severity": risk.severity, "category": risk.category} for risk in result.risks],
        "error": result.error,
    }


class Cancelled(RuntimeError):
    pass


class Orchestrator:
    def __init__(
        self,
        *,
        bundle: InputBundle,
        mode: str = "autonomous",
        chosen_methodology_ids: Optional[list[str]] = None,
        max_iterations: Optional[int] = None,
        concurrency: Optional[int] = None,
        workflow: Optional[Workflow] = None,
        run_id: Optional[str] = None,
        custom_specs: Optional[list[Any]] = None,
    ) -> None:
        #: User-defined agents for this run. Held on the orchestrator rather
        #: than left in the caller's context, because the run executes in a
        #: task the HTTP layer does not own and a ContextVar set around the
        #: streaming response does not reliably reach it.
        self.custom_specs = list(custom_specs or [])
        self.bundle = bundle
        self.mode = mode
        self.chosen_ids = chosen_methodology_ids or []
        self.max_iterations = max(1, max_iterations or settings.max_iterations)
        self.concurrency = max(1, concurrency or settings.concurrency)

        self.run_id = run_id or uuid.uuid4().hex
        with custom.overlay(self.custom_specs):
            self.workflow = workflow or build_workflow()
        self.graph: AgentGraph = graph_for(self.workflow)
        self.degraded: list[str] = []
        self.log_entries: list[dict[str, Any]] = []

        self._events: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        #: Approval gates the run is currently blocked on, by node id.
        self._approvals: dict[str, asyncio.Future[dict[str, Any]]] = {}

    # ── Event plumbing ──────────────────────────────────────────────────

    def _emit(self, event_type: str, payload: Any) -> None:
        self._events.put_nowait({"type": event_type, "payload": payload})

    def _node(self, node_id: str, **changes: Any) -> None:
        node = self.graph.update(node_id, **changes)
        if node is not None:
            self._emit("node", node.to_dict())

    def _stage(self, message: str) -> None:
        self._emit("stage", {"message": message})
        self._log("stage", message)

    def _log(self, kind: str, message: str, node_id: Optional[str] = None, **extra: Any) -> None:
        """Append to the execution timeline. Every entry is timestamped so the
        user can see not just what ran, but in what order and how long it took."""
        entry = {
            "id": f"{len(self.log_entries)}",
            "at": datetime.now(timezone.utc).isoformat(),
            "kind": kind,
            "message": message,
            "nodeId": node_id,
            **extra,
        }
        self.log_entries.append(entry)
        self._emit("log", entry)

    async def _gate(self, node_id: str, question: str, payload: Optional[dict[str, Any]] = None) -> bool:
        """Pause for a human if the workflow asks for approval at this node.

        Returns True to continue. A rejection ends the run; that is the point
        of the checkpoint — the user is stopping work they do not want done.
        """
        node = self.workflow.node(node_id)
        if node is None or not node.requires_approval:
            return True

        future: asyncio.Future[dict[str, Any]] = asyncio.get_running_loop().create_future()
        self._approvals[node_id] = future

        self._node(node_id, status="awaiting_approval", detail=question)
        self._log("approval_required", question, node_id)
        self._emit("approval_required", {
            "runId": self.run_id,
            "nodeId": node_id,
            "label": node.label,
            "question": question,
            "payload": payload or {},
        })

        decision = await future
        self._approvals.pop(node_id, None)

        approved = bool(decision.get("approved"))
        note = str(decision.get("note") or "").strip()
        self._log(
            "approval_resolved",
            f"{'Approved' if approved else 'Rejected'}{f': {note}' if note else ''}",
            node_id,
        )
        self._emit("approval_resolved", {"runId": self.run_id, "nodeId": node_id, "approved": approved, "note": note})

        if not approved:
            self._node(node_id, status="failed", detail="Stopped by the user", error="Rejected at approval checkpoint")
        if note:
            # A note at a checkpoint is founder-grade input for later agents.
            self.bundle.gapAnswers = {**(self.bundle.gapAnswers or {}), f"approval_note::{node_id}": note}
        return approved

    def resolve_approval(self, node_id: str, approved: bool, note: str = "") -> bool:
        """Called from the HTTP layer when the user decides."""
        future = self._approvals.get(node_id)
        if future is None or future.done():
            return False
        future.set_result({"approved": approved, "note": note})
        return True

    @property
    def pending_approvals(self) -> list[str]:
        return [node_id for node_id, future in self._approvals.items() if not future.done()]

    # ── Stage 1: understanding ──────────────────────────────────────────

    async def _understand(self) -> StartupProfile:
        agent = CORE_AGENTS["understand"]
        self._node("input", status="completed")
        self._node("understand", status="running", detail=agent.activity)
        self._stage(agent.activity)

        started = time.perf_counter()
        try:
            response = await llm.run(
                role=agent.role, instruction=agent.instruction, schema=agent.schema,
                context=digest_bundle(self.bundle), label=self.bundle.startupName,
            )
        except AgentError as error:
            self._node("understand", status="failed", error=str(error))
            raise AgentError(f"Could not build a startup profile, so no analysis is possible: {error}") from error

        profile = normalise_profile(response.output, self.bundle.startupName)
        duration = int((time.perf_counter() - started) * 1000)
        self._node(
            "understand", status="completed",
            confidence=profile.evidenceQuality,
            duration_ms=duration,
            detail=f"{profile.stage.replace('_', '-')} · {', '.join(profile.industries)}",
            headline=profile.name,
            summary={
                "stage": profile.stage,
                "industries": profile.industries,
                "evidenceItems": len(profile.evidence),
                "dataGaps": len(profile.dataGaps),
                "riskFlags": len(profile.riskFlags),
            },
        )
        self._log("agent_completed", f"Startup understanding completed in {duration / 1000:.1f}s", "understand")
        self._emit("profile", profile.model_dump())
        return profile

    # ── Stage 2: planning ───────────────────────────────────────────────

    async def _plan(self, profile: StartupProfile) -> AnalysisPlan:
        gate = gate_methodologies(profile, self.bundle)
        self._node("select", status="running", detail=CORE_AGENTS["select"].activity)
        self._stage(CORE_AGENTS["select"].activity)

        # A workflow compiled from a command already names the methodologies the
        # instruction needs; running the planner would only widen it back out.
        workflow_ids = self.workflow.methodology_ids()
        constrained = self.mode == "autonomous" and 0 < len(workflow_ids) < len(registry.active())
        if constrained:
            plan = build_manual_plan(gate, workflow_ids, enforce_mandatory=True)
            plan.strategy = self.workflow.strategy or f"Scoped to the instruction: {self.workflow.goal}"
            plan.notes = "Methodologies were scoped by the command you gave, then filtered by applicability."
            self._node("select", status="completed", detail=plan.strategy[:120],
                       headline=f"{len(plan.selected_ids())} methodologies")
            self._apply_plan_to_graph(plan)
            self._emit("plan", plan.model_dump())
            return plan

        if self.mode != "autonomous":
            # Guided mode still produces a full thesis, so risk analysis is
            # kept; manual mode runs exactly what the user asked for.
            plan = build_manual_plan(gate, self.chosen_ids, enforce_mandatory=self.mode == "guided")
            self._node("select", status="completed", detail="Selected by the user")
            self._apply_plan_to_graph(plan)
            self._emit("plan", plan.model_dump())
            return plan

        agent = CORE_AGENTS["select"]
        candidates = [spec for spec in (registry.get(mid) for mid in gate.candidates) if spec is not None]
        context = {
            "profile": profile.model_dump(),
            "candidateMethodologies": registry.summaries(candidates),
            "ruledOutByPlatform": gate.excluded,
            "availableData": digest_bundle(self.bundle),
        }

        started = time.perf_counter()
        try:
            response = await llm.run(
                role=agent.role, instruction=agent.instruction, schema=agent.schema,
                context=context, label=profile.name,
            )
            plan = build_plan(gate, response.output)
            self._node(
                "select", status="completed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                detail=plan.strategy[:120],
                headline=f"{len(plan.selected_ids())} methodologies",
            )
        except AgentError as error:
            # Falling back to the deterministic gates is a real degradation,
            # not a silent one: it is recorded and shown in the report.
            plan = build_plan(gate, None)
            self.degraded.append(f"Methodology planning fell back to the platform's applicability rules ({error}).")
            self._node("select", status="failed", error=str(error), detail="Fell back to platform rules")

        self._apply_plan_to_graph(plan)
        self._emit("plan", plan.model_dump())
        return plan

    def _apply_plan_to_graph(self, plan: AnalysisPlan) -> None:
        for entry in plan.entries:
            node_id = methodology_node_id(entry.methodologyId)
            if entry.selected:
                self._node(node_id, status="queued", detail=entry.reason[:140])
            else:
                self._node(node_id, status="skipped", detail=entry.reason[:140])

    # ── Stage 3: methodology execution ──────────────────────────────────

    def _methodology_context(
        self, spec: MethodologySpec, profile: StartupProfile, results: dict[str, MethodologyResult],
    ) -> dict[str, Any]:
        dependencies = [summarise_result(results[dep]) for dep in spec.depends_on if dep in results]
        return {
            "methodology": {
                "id": spec.id,
                "name": spec.name,
                "purpose": spec.purpose,
                "requiredInputs": [f"{item.label}: {item.description}" for item in spec.required_inputs],
                "optionalInputs": [f"{item.label}: {item.description}" for item in spec.optional_inputs],
                "knownLimitations": spec.limitations,
            },
            "startupProfile": profile.model_dump(),
            "rawMaterial": digest_bundle(self.bundle),
            "dependencyResults": dependencies or None,
        }

    async def _run_methodology(
        self,
        spec: MethodologySpec,
        profile: StartupProfile,
        results: dict[str, MethodologyResult],
        iteration: int,
        extra_instruction: str = "",
    ) -> MethodologyResult:
        node_id = methodology_node_id(spec.id)

        if not await self._gate(node_id, f"Run {spec.name} for this startup?", {"methodologyId": spec.id}):
            declined = MethodologyResult(
                methodologyId=spec.id, name=spec.name, family=spec.family, status="skipped",
                headline=f"{spec.name} was declined at the approval checkpoint.",
                limitations=list(spec.limitations),
            )
            # Emit it: a declined methodology is a reportable outcome, not a
            # silent absence, and the final memo records it as incomplete.
            self._node(node_id, status="skipped", detail="Declined at the approval checkpoint")
            self.degraded.append(f"{spec.name} was declined at the approval checkpoint.")
            self._emit("result", declined.model_dump())
            return declined

        self._node(node_id, status="running", iteration=iteration, detail=f"Running {spec.name}")
        self._log("agent_started", f"{spec.name} started", node_id)
        self._stage(f"Running {spec.name}")

        base = MethodologyResult(
            methodologyId=spec.id, name=spec.name, family=spec.family, status="failed",
            limitations=list(spec.limitations),
        )
        started = time.perf_counter()

        try:
            instruction = spec.instruction
            if extra_instruction:
                instruction = (
                    f"{spec.instruction}\n\nRE-RUN — the critic reviewed your previous result and requires: {extra_instruction}"
                )

            response = await llm.run(
                role="methodology",
                instruction=instruction,
                schema=spec.output_schema,
                context=self._methodology_context(spec, profile, results),
                label=f"{profile.name} — {spec.name}",
            )

            raw = response.output or {}
            evidence = normalise_evidence(raw.get("evidence"), spec.id)
            missing_inputs = strings(raw.get("missingInputs"))

            computed = (
                spec.compute(raw.get("inputs") or {}, ComputeContext(profile=profile, bundle=self.bundle, results=results))
                if spec.compute else None
            )

            confidence = methodology_confidence(
                spec=spec,
                agent_confidence=clamp(raw.get("confidence"), 0, 1, 0.5),
                evidence=evidence,
                missing_input_count=len(missing_inputs),
                compute_penalty=computed.confidencePenalty if computed else 0.0,
            )

            valuation = computed.valuation if computed else None
            # A valuation methodology that could not produce a number is
            # reported as insufficient input, not as a $0 valuation.
            status = "insufficient_input" if spec.family == "valuation" and valuation is None else "completed"

            headline = text(raw.get("headline")) or (
                f"{spec.name}: ${valuation.point:,.0f}" if valuation else f"{spec.name}: no conclusion"
            )

            result = base.model_copy(update={
                "status": status,
                "headline": headline,
                "valuation": valuation,
                "score10": computed.score10 if computed else None,
                "inputs": raw.get("inputs") or {},
                "computed": {**(computed.computed if computed else {}), "platformNotes": computed.notes if computed else []},
                "reasoning": text(raw.get("reasoning")),
                "assumptions": strings(raw.get("assumptions")),
                "limitations": list(spec.limitations) + strings(raw.get("limitations")),
                "missingInputs": missing_inputs,
                "evidence": evidence,
                "risks": normalise_risks(raw.get("risks"), spec.id),
                "confidence": confidence,
                "durationMs": response.duration_ms,
            })

            node_headline = (
                f"${valuation.point:,.0f}" if valuation
                else (f"{result.score10:.1f}/10" if result.score10 is not None else "")
            )
            self._node(
                node_id, status="completed" if status == "completed" else "failed",
                confidence=confidence, duration_ms=response.duration_ms,
                headline=node_headline, detail=result.headline[:140],
                error=None if status == "completed" else "Required inputs were unavailable.",
                summary={
                    "evidenceItems": len(result.evidence),
                    "assumptions": len(result.assumptions),
                    "missingInputs": len(result.missingInputs),
                    "risksSurfaced": len(result.risks),
                    "valuation": result.valuation.model_dump() if result.valuation else None,
                    "score10": result.score10,
                },
            )
            self._log(
                "agent_completed",
                f"{spec.name} completed in {(response.duration_ms or 0) / 1000:.1f}s"
                + (f" - {node_headline}" if node_headline else ""),
                node_id,
            )
            self._emit("result", result.model_dump())
            return result

        except Exception as error:  # noqa: BLE001 - one methodology must not end the analysis
            message = str(error) or "Unknown error"
            log.warning("methodology %s failed: %s", spec.id, message)
            result = base.model_copy(update={
                "status": "failed", "error": message, "headline": f"{spec.name} did not complete.",
                "durationMs": int((time.perf_counter() - started) * 1000),
            })
            self.degraded.append(f"{spec.name} failed: {message}")
            self._node(node_id, status="failed", error=message, detail="Did not complete")
            self._log("agent_failed", f"{spec.name} failed: {message}", node_id)
            self._emit("result", result.model_dump())
            return result

    async def _run_waves(
        self, ids: list[str], profile: StartupProfile, results: dict[str, MethodologyResult], iteration: int,
    ) -> None:
        semaphore = asyncio.Semaphore(self.concurrency)

        for wave in registry.plan_execution_waves(ids):
            specs = [spec for spec in (registry.get(mid) for mid in wave) if spec is not None]
            if not specs:
                continue

            async def run_one(spec: MethodologySpec) -> MethodologyResult:
                async with semaphore:
                    return await self._run_methodology(spec, profile, results, iteration)

            for result in await asyncio.gather(*(run_one(spec) for spec in specs)):
                results[result.methodologyId] = result

    # ── Stage 4: critique ───────────────────────────────────────────────

    async def _critique(
        self,
        profile: StartupProfile,
        plan: AnalysisPlan,
        results: dict[str, MethodologyResult],
        spread: ValuationSpread,
        disagreements: list[Disagreement],
        iteration: int,
    ) -> tuple[Optional[Critique], Optional[dict[str, Any]]]:
        agent = CORE_AGENTS["critic"]
        self._node("critic", status="running", iteration=iteration, detail=agent.activity)
        self._stage(agent.activity)

        context = {
            "startupProfile": profile.model_dump(),
            "analysisPlan": {
                "strategy": plan.strategy,
                "selected": [{"id": e.methodologyId, "reason": e.reason} for e in plan.entries if e.selected],
                "excluded": [{"id": e.methodologyId, "reason": e.reason} for e in plan.entries if not e.selected],
            },
            "methodologyResults": [summarise_result(result) for result in results.values()],
            "valuationSpread": {
                "estimates": [
                    {
                        "methodologyId": entry.methodology_id, "name": entry.name,
                        "low": entry.valuation.low, "point": entry.valuation.point, "high": entry.valuation.high,
                        "confidence": entry.confidence, "flaggedAsOutlier": entry.is_outlier,
                    }
                    for entry in spread.entries
                ],
                "spreadRatio": spread.spread_ratio,
                "agreement": spread.agreement,
                "provisionalRange": spread.provisional.model_dump() if spread.provisional else None,
            },
            "detectedDisagreements": [
                {
                    "id": item.id, "topic": item.topic, "parties": item.parties,
                    "values": [value.model_dump() for value in item.values], "severity": item.severity,
                }
                for item in disagreements
            ],
            "userFollowUp": self.bundle.gapAnswers or None,
            "iteration": iteration,
        }

        # A challenge from the user is not optional context — the critic has to
        # engage with it rather than restate the conclusion being challenged.
        challenge = (self.bundle.gapAnswers or {}).get(USER_CHALLENGE_KEY)
        instruction = agent.instruction
        if challenge:
            instruction = (
                f"{agent.instruction}\n\nThe user has challenged this analysis: \"{challenge}\"\n"
                "Address that challenge explicitly: say whether it is supported by the evidence, what it would change if true, "
                "and what would settle it. Do not simply restate the conclusion being challenged, and do not defer to the user "
                "either — assess the claim."
            )

        started = time.perf_counter()
        try:
            response = await llm.run(
                role=agent.role, instruction=instruction, schema=agent.schema,
                context=context, label=profile.name,
            )
        except AgentError as error:
            # Without a critic the analysis is materially weaker, so confidence
            # is capped and the report says why.
            self.degraded.append(f"Cross-validation did not run ({error}); confidence is capped at 0.5 as a result.")
            self._node("critic", status="failed", error=str(error), detail="Did not run")
            return None, None

        raw = response.output or {}
        critique = normalise_critique(raw)

        # Fold the critic's explanations back into the detected disagreements.
        analysis = {
            text(item.get("id")): item
            for item in (raw.get("disagreementAnalysis") or []) if isinstance(item, dict)
        }
        for item in disagreements:
            explained = analysis.get(item.id)
            if not explained:
                continue
            item.rootCause = text(explained.get("rootCause"))
            item.moreCredible = text(explained.get("moreCredible"), "unresolved")
            item.explanation = text(explained.get("explanation"))
            item.missingInfo = strings(explained.get("missingInfo"))

        raw_reconciliation = raw.get("reconciliation") if isinstance(raw.get("reconciliation"), dict) else {}
        reconciliation = {
            "explanation": text(raw_reconciliation.get("explanation")),
            "keyAssumptions": strings(raw_reconciliation.get("keyAssumptions")),
            "exclude": [
                {"methodologyId": text(item.get("methodologyId")), "reason": text(item.get("reason"))}
                for item in (raw_reconciliation.get("exclude") or [])
                if isinstance(item, dict) and text(item.get("methodologyId"))
            ],
            "reweight": [
                {
                    "methodologyId": text(item.get("methodologyId")),
                    "multiplier": clamp(item.get("multiplier"), 0.1, 3, 1),
                    "rationale": text(item.get("rationale")),
                }
                for item in (raw_reconciliation.get("reweight") or [])
                if isinstance(item, dict) and text(item.get("methodologyId"))
            ],
        }

        self._node(
            "critic", status="completed",
            confidence=critique.confidenceCeiling,
            duration_ms=int((time.perf_counter() - started) * 1000),
            detail=critique.summary[:140],
            headline=critique.verdict.replace("_", " "),
            summary={
                "verdict": critique.verdict,
                "redFlags": len(critique.redFlags),
                "contradictions": len(critique.contradictions),
                "unsupportedAssumptions": len(critique.unsupportedAssumptions),
                "rerunRequests": len(critique.rerunRequests),
                "confidenceCeiling": critique.confidenceCeiling,
            },
        )
        self._log(
            "agent_completed",
            f"Cross-validation completed - verdict {critique.verdict.replace('_', ' ')}, "
            f"{len(critique.redFlags)} red flag(s)",
            "critic",
        )
        self._emit("critique", critique.model_dump())
        self._emit("disagreements", [item.model_dump() for item in disagreements])
        return critique, reconciliation

    # ── Stage 5: synthesis ──────────────────────────────────────────────

    async def _synthesise(
        self,
        profile: StartupProfile,
        plan: AnalysisPlan,
        results: dict[str, MethodologyResult],
        reconciled: ReconciledValuation,
        critique: Optional[Critique],
        disagreements: list[Disagreement],
    ) -> Optional[InvestmentThesis]:
        agent = CORE_AGENTS["synthesis"]
        self._node("synthesis", status="running", detail=agent.activity)
        self._stage(agent.activity)

        completed = [result for result in results.values() if result.status == "completed"]
        incomplete = [
            IncompleteEntry(
                methodologyId=result.methodologyId,
                reason=result.error or ("Required inputs were unavailable." if result.status == "insufficient_input" else result.status),
            )
            for result in results.values() if result.status != "completed"
        ]

        context = {
            "startupProfile": profile.model_dump(),
            "methodologyResults": [summarise_result(result) for result in completed],
            "incompleteMethodologies": [entry.model_dump() for entry in incomplete],
            "reconciledValuation": reconciled.model_dump(),
            "disagreements": [item.model_dump() for item in disagreements],
            "critique": critique.model_dump() if critique else None,
            "degradations": self.degraded,
        }

        started = time.perf_counter()
        try:
            response = await llm.run(
                role=agent.role, instruction=agent.instruction, schema=agent.schema,
                context=context, label=profile.name,
            )
        except AgentError as error:
            self.degraded.append(f"Investment thesis synthesis failed: {error}")
            self._node("synthesis", status="failed", error=str(error))
            self._node("report", status="failed", detail="No thesis produced")
            return None

        raw = response.output or {}

        bull = normalise_scenario(raw.get("bullCase"), "Bull case")
        base_case = normalise_scenario(raw.get("baseCase"), "Base case")
        bear = normalise_scenario(raw.get("bearCase"), "Bear case")
        balance_scenarios(bull, base_case, bear)

        confidence = overall_confidence(
            results=results, plan=plan, critique=critique,
            profile_evidence_quality=profile.evidenceQuality,
            reconciled_confidence=reconciled.confidence if reconciled.range.point > 0 else None,
        )
        if critique is None:
            confidence.overall = min(confidence.overall, 0.5)

        # Risks come from the risk agent, the methodology agents and this pass;
        # dedupe by title so the same risk is not listed twice.
        aggregated = normalise_risks(raw.get("topRisks"), "synthesis") + [risk for result in completed for risk in result.risks]
        seen: set[str] = set()
        risks = []
        for risk in aggregated:
            key = risk.title.lower().strip()
            if key in seen:
                continue
            seen.add(key)
            risks.append(risk)

        severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        risks.sort(key=lambda risk: (severity_rank.get(risk.severity, 4), -risk.likelihood))

        gaps = (critique.missingInformation if critique else []) + profile.dataGaps + normalise_gaps(raw.get("missingInformation"))
        seen_gaps: set[str] = set()
        missing_information = []
        for gap in gaps:
            key = gap.field.lower().strip()
            if key in seen_gaps:
                continue
            seen_gaps.add(key)
            missing_information.append(gap)

        thesis = InvestmentThesis(
            executiveSummary=text(raw.get("executiveSummary")),
            thesis=text(raw.get("thesis")),
            sections=normalise_sections(raw.get("sections")),
            valuation=ValuationSummary(
                reconciled=reconciled,
                perMethodology=[
                    PerMethodologyValuation(
                        methodologyId=result.methodologyId, name=result.name,
                        range=result.valuation, confidence=result.confidence,
                    )
                    for result in results.values()
                    if (registry.get(result.methodologyId) or None) and registry.require(result.methodologyId).family == "valuation"
                ],
                keyAssumptions=list(dict.fromkeys(strings(raw.get("valuationAssumptions")) + reconciled.keyAssumptions)),
            ),
            risks=risks,
            missingInformation=missing_information,
            methodologySelectionExplanation=[
                SelectionExplanation(
                    methodologyId=entry.methodologyId,
                    name=registry.name_of(entry.methodologyId),
                    reason=entry.reason,
                    used=entry.selected and results.get(entry.methodologyId) is not None
                    and results[entry.methodologyId].status == "completed",
                )
                for entry in plan.entries
            ],
            confidence=confidence,
            bullCase=bull, baseCase=base_case, bearCase=bear,
            recommendation=as_recommendation(raw.get("recommendation")),
            recommendationReasoning=text(raw.get("recommendationReasoning")),
            incompleteAnalysis=incomplete,
        )

        self._node(
            "synthesis", status="completed",
            confidence=confidence.overall,
            duration_ms=int((time.perf_counter() - started) * 1000),
            headline=thesis.recommendation.replace("_", " "),
            detail=thesis.executiveSummary[:140],
            summary={
                "recommendation": thesis.recommendation,
                "sections": len(thesis.sections),
                "risks": len(thesis.risks),
                "missingInformation": len(thesis.missingInformation),
                "confidence": confidence.overall,
            },
        )
        self._log(
            "agent_completed",
            f"Investment thesis written - {thesis.recommendation.replace('_', ' ')} "
            f"at confidence {confidence.overall:.2f}",
            "synthesis",
        )
        self._node("report", status="completed", headline=thesis.recommendation.replace("_", " "),
                   confidence=confidence.overall)
        self._emit("thesis", thesis.model_dump())
        return thesis

    # ── Orchestration ───────────────────────────────────────────────────

    async def _pipeline(self) -> None:
        with custom.overlay(self.custom_specs):
            await self._run_pipeline()

    async def _run_pipeline(self) -> None:
        self._emit("run", {"runId": self.run_id, "workflow": self.workflow.to_dict()})
        self._emit("graph", self.graph.to_dict())
        self._log("run_started", f"Workflow \"{self.workflow.name}\" started")

        profile = await self._understand()
        if not await self._gate(
            "understand",
            "The analyst has read the material. Approve the extracted profile before methodologies run?",
            {"profile": profile.model_dump()},
        ):
            raise AgentError("Stopped at the startup-understanding checkpoint.")

        plan = await self._plan(profile)
        if not await self._gate(
            "select",
            "Approve the selected methodologies before they execute?",
            {"selected": plan.selected_ids()},
        ):
            raise AgentError("Stopped at the methodology-selection checkpoint.")

        ids = plan.selected_ids()
        if not ids:
            raise AgentError("No methodology could be applied to this startup with the information provided.")

        results: dict[str, MethodologyResult] = {}
        await self._run_waves(ids, profile, results, 0)

        if results and all(result.status == "failed" for result in results.values()):
            raise AgentError("Every methodology failed to execute. Check the AI service configuration and try again.")

        spread = analyse_valuation_spread(results)
        disagreements = detect_disagreements(results, spread)
        critique, reconciliation = await self._critique(profile, plan, results, spread, disagreements, 0)
        if not await self._gate(
            "critic",
            "Approve the cross-validation findings before the thesis is written?",
            {"verdict": critique.verdict if critique else "unavailable"},
        ):
            raise AgentError("Stopped at the cross-validation checkpoint.")
        iterations = 1

        # Critic-driven revision loop. Only the methodologies the critic asked
        # for are re-run — a full re-run would cost as much as the analysis.
        while (
            critique is not None
            and critique.verdict == "revise"
            and critique.rerunRequests
            and iterations < self.max_iterations
        ):
            requests = [
                (registry.get(request.methodologyId), request.instruction)
                for request in critique.rerunRequests
            ]
            requests = [(spec, instruction) for spec, instruction in requests if spec is not None]
            if not requests:
                break

            self._stage(f"Re-analysing {len(requests)} methodology result(s) after critique")
            semaphore = asyncio.Semaphore(self.concurrency)

            async def rerun(spec: MethodologySpec, instruction: str) -> MethodologyResult:
                async with semaphore:
                    return await self._run_methodology(spec, profile, results, iterations, instruction)

            for result in await asyncio.gather(*(rerun(spec, instruction) for spec, instruction in requests)):
                # Keep the original if the re-run failed — a failed retry must
                # not destroy a result we already had.
                if result.status != "failed":
                    results[result.methodologyId] = result

            spread = analyse_valuation_spread(results)
            disagreements = detect_disagreements(results, spread)
            critique, reconciliation = await self._critique(profile, plan, results, spread, disagreements, iterations)
            iterations += 1

        self._node("reconcile", status="running", detail="Weighting, excluding outliers, explaining the spread")
        reconciled = finalise(spread, reconciliation)
        self._node(
            "reconcile", status="completed",
            confidence=reconciled.confidence,
            headline=f"${reconciled.range.point:,.0f}" if reconciled.range.point else "no valuation",
            detail=f"{len(reconciled.weights)} methods weighted · {len(reconciled.excluded)} excluded",
        )
        self._emit("reconciled", reconciled.model_dump())
        self._log(
            "reconciled",
            f"Reconciled valuation ${reconciled.range.point:,.0f} "
            f"({len(reconciled.weights)} methods weighted, {len(reconciled.excluded)} excluded)",
            "reconcile",
        )

        if not await self._gate(
            "reconcile",
            "Approve the reconciled valuation range before it goes into the memo?",
            {"range": reconciled.range.model_dump()},
        ):
            raise AgentError("Stopped at the valuation-reconciliation checkpoint.")

        if not await self._gate(
            "synthesis",
            "Approve writing the final investment thesis?",
            {"methodologiesCompleted": len([r for r in results.values() if r.status == "completed"])},
        ):
            raise AgentError("Stopped at the synthesis checkpoint.")

        thesis = await self._synthesise(profile, plan, results, reconciled, critique, disagreements)

        self._log("run_completed", "Analysis complete")
        self._emit("done", {
            "runId": self.run_id,
            "iterations": iterations,
            "degradations": self.degraded,
            "hasThesis": thesis is not None,
            "log": self.log_entries,
        })

    async def stream(self) -> AsyncIterator[dict[str, Any]]:
        """Run the pipeline, yielding events as each stage progresses."""
        task = asyncio.create_task(self._pipeline())

        try:
            while True:
                queue_get = asyncio.create_task(self._events.get())
                done, _ = await asyncio.wait({queue_get, task}, return_when=asyncio.FIRST_COMPLETED)

                if queue_get in done:
                    yield queue_get.result()
                    continue

                queue_get.cancel()

                # The pipeline finished; drain anything it queued last.
                while not self._events.empty():
                    yield self._events.get_nowait()

                error = task.exception()
                if error is not None:
                    log.exception("analysis failed", exc_info=error)
                    yield {"type": "error", "payload": {"message": str(error) or "Analysis failed."}}
                return
        finally:
            if not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):  # noqa: BLE001
                    pass
