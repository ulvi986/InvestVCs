// React binding for the Python analyst service.
//
// Consumes the SSE stream, keeps the live graph and results in state, and
// mirrors everything to Supabase as it arrives so a session survives a reload.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type {
  AnalysisPlan, Critique, Disagreement, InputBundle, InvestmentThesis,
  MethodologyResult, ReconciledValuation, SessionMode, SessionStatus, StartupProfile,
} from "@/lib/analyst/types";
import type {
  AgentGraphData, ApprovalRequest, ExecutionLogEntry, WorkflowSpec,
} from "@/lib/analyst/graphTypes";
import { applyNodeUpdate, emptyGraph } from "@/lib/analyst/graphTypes";
import type { CustomAgent } from "@/lib/analyst/service";
import { ServiceError, analyze, isServiceConfigured, resolveApproval } from "@/lib/analyst/service";
import { createSession, loadSession, patchSession, saveEvidence } from "@/lib/analyst/persistence";

export interface AnalystState {
  sessionId: string | null;
  /** Set by the first stream event. Approvals are addressed to it. */
  runId: string | null;
  status: SessionStatus;
  statusMessage: string;
  mode: SessionMode;
  startupName: string;
  /** The workflow the orchestrator is executing, as opposed to its state. */
  workflow: WorkflowSpec | null;
  graph: AgentGraphData;
  /** Timestamped execution timeline, in arrival order. */
  log: ExecutionLogEntry[];
  /** Non-null while the run is blocked on a person. */
  approval: ApprovalRequest | null;
  /** True while an approval decision is in flight. */
  resolvingApproval: boolean;
  profile: StartupProfile | null;
  plan: AnalysisPlan | null;
  results: Record<string, MethodologyResult>;
  disagreements: Disagreement[];
  reconciled: ReconciledValuation | null;
  critique: Critique | null;
  thesis: InvestmentThesis | null;
  degradations: string[];
  iterations: number;
  error: string | null;
  persisted: boolean;
}

const initialState: AnalystState = {
  sessionId: null,
  runId: null,
  status: "draft",
  statusMessage: "",
  mode: "autonomous",
  startupName: "",
  workflow: null,
  graph: emptyGraph(),
  log: [],
  approval: null,
  resolvingApproval: false,
  profile: null,
  plan: null,
  results: {},
  disagreements: [],
  reconciled: null,
  critique: null,
  thesis: null,
  degradations: [],
  iterations: 0,
  error: null,
  persisted: false,
};

export interface StartOptions {
  bundle: InputBundle;
  mode: SessionMode;
  chosenMethodologyIds?: string[];
  maxIterations?: number;
  /** Run this exact workflow, from the command bar or the builder. */
  workflow?: WorkflowSpec;
  templateId?: string;
  /** Agents this team defined, sent with the run. */
  customAgents?: CustomAgent[];
}

export function useInvestmentAnalyst() {
  const { user } = useAuth();
  const [state, setState] = useState<AnalystState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  // Mirrors state so callbacks can read the live run without re-creating on
  // every streamed event.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const update = useCallback(
    (patch: Partial<AnalystState> | ((prev: AnalystState) => Partial<AnalystState>)) => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
    },
    [],
  );

  const start = useCallback(
    async ({ bundle, mode, chosenMethodologyIds, maxIterations, workflow, templateId, customAgents }: StartOptions) => {
      if (!isServiceConfigured()) {
        update({
          status: "failed",
          error: "The AI analyst service is not configured. Set VITE_AI_SERVICE_URL to the deployed Python service.",
        });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const sessionId = user
        ? await createSession({ userId: user.id, startupName: bundle.startupName, mode, bundle })
        : null;

      setState({
        ...initialState,
        sessionId,
        persisted: Boolean(sessionId),
        mode,
        workflow: workflow ?? null,
        startupName: bundle.startupName,
        status: "running",
        statusMessage: "Starting analysis",
      });

      // Collected locally so the final write has everything, even if a
      // mid-flight patch failed.
      const results: Record<string, MethodologyResult> = {};
      let profile: StartupProfile | null = null;
      let plan: AnalysisPlan | null = null;
      let disagreements: Disagreement[] = [];
      let reconciled: ReconciledValuation | null = null;
      let critique: Critique | null = null;
      let thesis: InvestmentThesis | null = null;

      try {
        for await (const event of analyze({
          bundle, mode, chosenMethodologyIds, maxIterations, workflow, templateId, customAgents,
          sessionId: sessionId ?? undefined,
          signal: controller.signal,
        })) {
          if (!mountedRef.current) return;

          switch (event.type) {
            case "run":
              update({ runId: event.payload.runId, workflow: event.payload.workflow });
              break;

            case "log":
              update((prev) => ({ log: [...prev.log, event.payload] }));
              break;

            case "approval_required":
              // The stream stays open; the orchestrator is waiting on us.
              update({ approval: event.payload, statusMessage: "Waiting for your approval" });
              break;

            case "approval_resolved":
              update({ approval: null, resolvingApproval: false });
              break;

            case "graph":
              update({ graph: event.payload });
              break;

            case "node":
              update((prev) => ({ graph: applyNodeUpdate(prev.graph, event.payload) }));
              break;

            case "stage":
              update({ statusMessage: event.payload.message });
              break;

            case "profile":
              profile = event.payload;
              update({ profile, startupName: profile.name });
              if (sessionId) void patchSession(sessionId, { profile, startupName: profile.name, status: "running" });
              break;

            case "plan":
              plan = event.payload;
              update({ plan });
              if (sessionId) void patchSession(sessionId, { plan });
              break;

            case "result":
              results[event.payload.methodologyId] = event.payload;
              update({ results: { ...results } });
              break;

            case "disagreements":
              disagreements = event.payload;
              update({ disagreements });
              break;

            case "reconciled":
              reconciled = event.payload;
              update({ reconciled });
              break;

            case "critique":
              critique = event.payload;
              update({ critique });
              break;

            case "thesis":
              thesis = event.payload;
              update({ thesis });
              break;

            case "done":
              update({
                status: "completed",
                statusMessage: "Analysis complete",
                approval: null,
                runId: event.payload.runId,
                log: event.payload.log,
                degradations: event.payload.degradations,
                iterations: event.payload.iterations,
                error: event.payload.hasThesis
                  ? null
                  : "The investment thesis could not be generated. The methodology results below are still valid.",
              });

              if (sessionId && user) {
                await patchSession(sessionId, {
                  status: "completed",
                  results, disagreements, reconciled, critique, thesis, plan, profile,
                  iteration: event.payload.iterations,
                  degradations: event.payload.degradations,
                  completed: true,
                });
                void saveEvidence(user.id, sessionId, [
                  ...(profile?.evidence ?? []),
                  ...Object.values(results).flatMap((result) => result.evidence ?? []),
                ]);
              }
              break;

            case "error":
              throw new ServiceError(event.payload.message);
          }
        }
      } catch (error) {
        if (!mountedRef.current) return;
        const cancelled = controller.signal.aborted;
        const message = error instanceof Error ? error.message : "Analysis failed.";
        update({
          status: cancelled ? "draft" : "failed",
          statusMessage: cancelled ? "Cancelled" : "Analysis failed",
          error: cancelled ? null : message,
        });
        if (sessionId) {
          void patchSession(sessionId, {
            status: cancelled ? "draft" : "failed",
            error: cancelled ? null : message,
          });
        }
      }
    },
    [user, update],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    update({ status: "draft", statusMessage: "Cancelled", approval: null });
  }, [update]);

  /**
   * Answer the checkpoint the run is blocked on.
   *
   * The decision goes over a separate request; the orchestrator then resumes
   * and the open SSE stream reports `approval_resolved`. Nothing is optimistic
   * here, because the run either resumed or it did not.
   */
  const respondToApproval = useCallback(
    async (approved: boolean, note = "") => {
      const { runId, approval } = stateRef.current;
      if (!runId || !approval) return;

      update({ resolvingApproval: true });
      try {
        await resolveApproval(runId, approval.nodeId, approved, note);
      } catch (error) {
        update({
          resolvingApproval: false,
          error:
            error instanceof ServiceError && error.status === 404
              ? "That run is no longer active, so the decision could not be delivered. Run the analysis again."
              : (error as Error).message,
        });
      }
    },
    [update],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  const open = useCallback(
    async (sessionId: string) => {
      update({ statusMessage: "Loading session" });
      const session = await loadSession(sessionId);
      if (!session) {
        update({ error: "That analysis session could not be loaded.", statusMessage: "" });
        return;
      }
      setState({
        ...initialState,
        sessionId: session.id,
        status: session.status,
        mode: session.mode,
        startupName: session.startupName,
        // A stored session has no live graph; the results below carry it.
        graph: emptyGraph(),
        profile: session.profile,
        plan: session.plan,
        results: session.results ?? {},
        disagreements: session.disagreements ?? [],
        reconciled: session.reconciled,
        critique: session.critique,
        thesis: session.thesis,
        iterations: session.iteration ?? 0,
        error: session.error,
        persisted: true,
      });
    },
    [update],
  );

  return {
    state,
    start,
    cancel,
    reset,
    open,
    respondToApproval,
    isRunning: state.status === "running",
    /** The run is open but the orchestrator is blocked on a person. */
    isWaitingOnUser: state.approval !== null,
  };
}
