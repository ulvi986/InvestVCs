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
import {
  ServiceError, analyze, attachRun, cancelRun, isServiceConfigured, resolveApproval,
} from "@/lib/analyst/service";
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

/**
 * Whether a newly streamed result should replace the one already held.
 *
 * The critic can ask for a methodology to be re-run, so the same id arrives
 * twice. The second attempt is not always better: it can fail, decide it has
 * too little to work with, or come back with no confidence behind it. The
 * service keeps the stronger of the two for its own reconciliation, so a UI
 * that takes whichever arrived last ends up showing a blank where the
 * analysis actually has an answer, and disagreeing with its own report.
 */
export const supersedes = (
  previous: MethodologyResult | undefined,
  candidate: MethodologyResult,
): boolean => {
  if (!previous) return true;
  if (candidate.status === "failed" || candidate.status === "insufficient_input") return false;
  if ((candidate.confidence ?? 0) <= 0 && (previous.confidence ?? 0) > 0) return false;
  return true;
};

/**
 * Where the id of a run in flight is kept.
 *
 * The analysis itself is in Supabase; this is not. A run id addresses a
 * live stream on one service instance, which is browser-and-moment scoped
 * in a way a session row is not, and the service forgets it within hours.
 * Keeping it here lets a reload rejoin the run it was already watching
 * without inviting another device to try.
 *
 * Without it, reloading mid-run loaded the session row, read its
 * 'running' status and rendered a Stop button over an empty canvas - a
 * page that said an analysis was in progress while showing none of it.
 */
const liveRunKey = (sessionId: string) => `investvcs.liveRun.${sessionId}`;

export function rememberLiveRun(sessionId: string | null, runId: string | null) {
  if (!sessionId) return;
  try {
    if (runId) localStorage.setItem(liveRunKey(sessionId), runId);
    else localStorage.removeItem(liveRunKey(sessionId));
  } catch {
    // Blocked storage. Losing this costs a reattach, not the analysis.
  }
}

export function recallLiveRun(sessionId: string): string | null {
  try {
    return localStorage.getItem(liveRunKey(sessionId));
  } catch {
    return null;
  }
}

/**
 * What to show for a session whose stored status is still `running`.
 *
 * Three cases, and only the first is ordinary: the run finished normally
 * and the row says so. A row left mid-flight was interrupted - the page was
 * closed or reloaded while the service carried on. That is recoverable when
 * this browser remembers which run it was, and is not when it does not, and
 * the difference has to reach the screen: presenting an unrecoverable one as
 * live gave a Stop button over an empty canvas.
 *
 * Mid-flight means queued as well as running. A row is created queued and
 * only becomes running once the service has accepted the run, so a reload in
 * the seconds between the two found a queued row, treated it as an ordinary
 * unstarted session, and abandoned a run it could have rejoined.
 */
const MID_FLIGHT: SessionStatus[] = [
  "queued", "running", "waiting_for_input",
];

export function strandedRun(
  status: SessionStatus,
  rememberedRunId: string | null,
): { status: SessionStatus; rejoin: string | null; error: string | null } {
  if (!MID_FLIGHT.includes(status)) return { status, rejoin: null, error: null };
  if (rememberedRunId) return { status: "running", rejoin: rememberedRunId, error: null };
  return {
    status: "failed",
    rejoin: null,
    error:
      "This analysis was still running when the page was closed, and this browser can no "
      + "longer follow it. Anything it finished is below; run it again for the rest.",
  };
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
  /** Events consumed so far. A reattach replays from here, so nothing is
   *  applied twice and nothing in the gap is lost. */
  const seenRef = useRef(0);
  /** The service-side run id, kept outside state so the reconnect loop can
   *  read it without waiting for a render. */
  const runIdRef = useRef<string | null>(null);
  /** Set when the user cancels, so a deliberate stop is never retried. */
  const abandonedRef = useRef(false);

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

  /**
   * Drive the state machine from a stream of run events.
   *
   * Shared by starting a run and rejoining one, because after the first
   * event the two are the same thing: the service replays a reattached run
   * from the beginning, so every branch below has to be reached either
   * way. Two copies of this would drift, and the copy nobody looks at
   * would be the reattach.
   */
  const consume = useCallback(
    async (options: {
      controller: AbortController;
      sessionId: string | null;
      resumeRunId?: string;
      bundle?: InputBundle;
      mode?: SessionMode;
      chosenMethodologyIds?: string[];
      maxIterations?: number;
      workflow?: WorkflowSpec;
      templateId?: string;
      customAgents?: CustomAgent[];
    }) => {
      const {
        controller, sessionId, resumeRunId, bundle, mode, chosenMethodologyIds,
        maxIterations, workflow, templateId, customAgents,
      } = options;

      // Collected locally so the final write has everything, even if a
      // mid-flight patch failed.
      const results: Record<string, MethodologyResult> = {};
      let profile: StartupProfile | null = null;
      let plan: AnalysisPlan | null = null;
      let disagreements: Disagreement[] = [];
      let reconciled: ReconciledValuation | null = null;
      let critique: Critique | null = null;
      let thesis: InvestmentThesis | null = null;

      seenRef.current = 0;
      runIdRef.current = resumeRunId ?? null;
      abandonedRef.current = false;

      // The service keeps a run alive when its reader goes away, so a dropped
      // connection is recoverable: reconnect and replay from `seenRef`. Without
      // this, backgrounding the tab long enough for the browser to drop the
      // stream threw away the whole analysis.
      const source = async function* () {
        let attempt = 0;
        while (true) {
          const first = seenRef.current === 0 && runIdRef.current === null;
          try {
            const stream = first
              ? analyze({
                  bundle: bundle as InputBundle,
                  mode: mode as SessionMode,
                  chosenMethodologyIds, maxIterations, workflow, templateId,
                  customAgents,
                  sessionId: sessionId ?? undefined,
                  signal: controller.signal,
                })
              : attachRun(runIdRef.current as string, seenRef.current, controller.signal);

            for await (const event of stream) {
              attempt = 0;
              seenRef.current += 1;
              yield event;
            }
            return;
          } catch (error) {
            const deliberate = controller.signal.aborted || abandonedRef.current;
            // A 404 is the service saying it no longer holds this run - it
            // finished and aged out, or the instance restarted. Retrying that
            // four times over eight seconds only delays the explanation.
            const gone = error instanceof ServiceError && error.status === 404;
            const resumable =
              !deliberate && !gone && runIdRef.current !== null && attempt < 4;
            if (!resumable) throw error;

            attempt += 1;
            update({ statusMessage: `Connection lost - reconnecting (${attempt}/4)` });
            await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 500 * 2 ** attempt)));
            if (!mountedRef.current || controller.signal.aborted) return;
          }
        }
      };

      try {
        for await (const event of source()) {
          if (!mountedRef.current) return;

          switch (event.type) {
            case "run":
              runIdRef.current = event.payload.runId;
              rememberLiveRun(sessionId, event.payload.runId);
              // The row is running from here, not from the profile stage:
              // this is the moment the service took the run, and a reload
              // before the profile arrives has to find it that way.
              if (sessionId) void patchSession(sessionId, { status: "running" });
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
              if (supersedes(results[event.payload.methodologyId], event.payload)) {
                results[event.payload.methodologyId] = event.payload;
                update({ results: { ...results } });
              }
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
              rememberLiveRun(sessionId, null);
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
        rememberLiveRun(sessionId, null);
        if (!mountedRef.current) return;
        const cancelled = controller.signal.aborted;
        const gone = error instanceof ServiceError && error.status === 404;
        const message = gone
          ? "The run this page was following has already finished on the service and is no longer available to rejoin. Run the analysis again."
          : error instanceof Error ? error.message : "Analysis failed.";
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

      await consume({
        controller, sessionId, bundle, mode, chosenMethodologyIds, maxIterations,
        workflow, templateId, customAgents,
      });
    },
    [user, update, consume],
  );

  /**
   * Rejoin a run that is still going.
   *
   * The service holds a finished run for half an hour and an abandoned one
   * for two, and replays it from the first event, so what comes back is
   * the whole analysis rather than the tail of it.
   */
  const resume = useCallback(
    async (sessionId: string, runId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      update({
        status: "running",
        statusMessage: "Rejoining the run in progress",
        runId,
        error: null,
      });

      await consume({ controller, sessionId, resumeRunId: runId });
    },
    [update, consume],
  );

  /**
   * Stop the analysis.
   *
   * Closing the stream no longer ends a run - that is what makes reconnecting
   * possible - so the service is told explicitly, otherwise the run would carry
   * on burning model time with nobody reading it.
   */
  const cancel = useCallback(() => {
    abandonedRef.current = true;
    const runId = runIdRef.current;
    abortRef.current?.abort();
    if (runId) void cancelRun(runId);
    rememberLiveRun(stateRef.current.sessionId, null);
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

      // strandedRun owns the question of which states are mid-flight; asking
      // it only about one of them is how a queued row lost its live run.
      const resolved = strandedRun(session.status, recallLiveRun(session.id));

      setState({
        ...initialState,
        sessionId: session.id,
        status: resolved.status,
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
        error: resolved.error ?? session.error,
        persisted: true,
      });

      if (resolved.rejoin) void resume(session.id, resolved.rejoin);
    },
    [update, resume],
  );

  return {
    state,
    start,
    cancel,
    reset,
    open,
    resume,
    respondToApproval,
    isRunning: state.status === "running",
    /** The run is open but the orchestrator is blocked on a person. */
    isWaitingOnUser: state.approval !== null,
  };
}
