// Client for the Python investment-analyst service.
//
// `analyze` streams Server-Sent Events, so the UI renders the agent graph
// executing rather than waiting on one long request. The orchestration itself
// lives entirely in `ai/` — this file only transports and types the events.

import type {
  AnalysisPlan, Critique, Disagreement, InputBundle, InvestmentThesis,
  MethodologyResult, ReconciledValuation, SessionMode, StartupProfile,
} from "./types";
import type {
  AgentGraphData, ApprovalRequest, ExecutionLogEntry, GraphNode,
  WorkflowSpec, WorkflowTemplate,
} from "./graphTypes";

const RAW_BASE = (import.meta.env?.VITE_AI_SERVICE_URL as string | undefined) ?? "";

/** Where `npm run ai` puts the Python service. */
export const DEV_SERVICE_URL = "http://127.0.0.1:8123";

/**
 * Base URL of the Python service.
 *
 * In development an unset variable falls back to the local service rather than
 * disabling the product: running the two halves of the app on one machine is
 * the normal case, and making the developer set an environment variable before
 * anything works is a poor trade. In a production build there is no sensible
 * default, so an unset variable stays empty and the UI says so.
 */
export const AI_SERVICE_URL = (
  RAW_BASE.trim() || (import.meta.env?.DEV ? DEV_SERVICE_URL : "")
).replace(/\/+$/, "");

export const isServiceConfigured = () => AI_SERVICE_URL.length > 0;

/**
 * Key under which the UI passes a user's challenge into the bundle's
 * `gapAnswers`. The orchestrator forces the critic to address it — see
 * `USER_CHALLENGE_KEY` in `ai/app/orchestrator.py`.
 */
export const USER_CHALLENGE_KEY = "user_challenge_to_the_conclusion";

export class ServiceError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

function requireBase(): string {
  if (!AI_SERVICE_URL) {
    throw new ServiceError(
      "The AI analyst service is not configured. Set VITE_AI_SERVICE_URL to the deployed Python service.",
    );
  }
  return AI_SERVICE_URL;
}

// ── Event contract (mirrors ai/app/orchestrator.py) ──────────────────────

export type AnalysisEvent =
  /** Opens the stream: the run id and the workflow that is about to execute. */
  | { type: "run"; payload: { runId: string; workflow: WorkflowSpec } }
  | { type: "graph"; payload: AgentGraphData }
  | { type: "node"; payload: GraphNode }
  | { type: "stage"; payload: { message: string } }
  /** One timestamped entry for the execution timeline. */
  | { type: "log"; payload: ExecutionLogEntry }
  /** The run has paused and will not continue until a person answers. */
  | { type: "approval_required"; payload: ApprovalRequest }
  | { type: "approval_resolved"; payload: { runId: string; nodeId: string; approved: boolean; note: string } }
  | { type: "profile"; payload: StartupProfile }
  | { type: "plan"; payload: AnalysisPlan }
  | { type: "result"; payload: MethodologyResult }
  | { type: "critique"; payload: Critique }
  | { type: "disagreements"; payload: Disagreement[] }
  | { type: "reconciled"; payload: ReconciledValuation }
  | { type: "thesis"; payload: InvestmentThesis }
  | {
      type: "done";
      payload: {
        runId: string;
        iterations: number;
        degradations: string[];
        hasThesis: boolean;
        log: ExecutionLogEntry[];
      };
    }
  | { type: "error"; payload: { message: string } };

/**
 * An agent this team defined. Sent with the run; the service turns it into a
 * real methodology that is gated, planned and executed like the built-ins.
 */
export interface CustomAgent {
  id: string;
  name: string;
  purpose: string;
  instruction: string;
  family: string;
  requiredInputs: string[];
}

export interface AnalyzeOptions {
  bundle: InputBundle;
  mode: SessionMode;
  chosenMethodologyIds?: string[];
  maxIterations?: number;
  sessionId?: string;
  /** A workflow the orchestrator compiled or the user edited, run as-is. */
  workflow?: WorkflowSpec;
  /** A saved template id, when the user picked one instead of editing. */
  templateId?: string;
  /** Agents this team added. Live for this run only. */
  customAgents?: CustomAgent[];
  signal?: AbortSignal;
}

/**
 * Minimal SSE parser.
 *
 * EventSource cannot POST, and the request body here is the whole input
 * bundle, so the stream is read off fetch directly. Frames are separated by a
 * blank line; the service also sends comment frames to defeat proxy buffering.
 */
async function* parseSSE(response: Response, signal?: AbortSignal): AsyncGenerator<AnalysisEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new ServiceError("The analyst service returned no stream.");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) return;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of frame.split("\n")) {
          if (line.startsWith(":")) continue; // keep-alive comment
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }

        if (!dataLines.length) continue;

        try {
          yield { type: eventName, payload: JSON.parse(dataLines.join("\n")) } as AnalysisEvent;
        } catch {
          // A malformed frame must not kill a running analysis.
          console.warn("Discarded an unparseable analysis event.");
        }
      }
    }
  } finally {
    // Releasing the lock lets an aborted request tear down promptly.
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

export async function* analyze(options: AnalyzeOptions): AsyncGenerator<AnalysisEvent> {
  const base = requireBase();

  let response: Response;
  try {
    response = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        bundle: options.bundle,
        mode: options.mode,
        chosenMethodologyIds: options.chosenMethodologyIds ?? [],
        maxIterations: options.maxIterations,
        sessionId: options.sessionId,
        workflow: options.workflow,
        templateId: options.templateId,
        customAgents: options.customAgents ?? [],
      }),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    throw new ServiceError(
      `Could not reach the analyst service at ${base}. Check that it is running and that CORS allows this origin.`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ServiceError(
      `The analyst service returned ${response.status}. ${detail.slice(0, 200)}`.trim(),
      response.status,
    );
  }

  yield* parseSSE(response, options.signal);
}

/**
 * Reattach to a run already in progress on the service.
 *
 * `from` is how many events this client already holds, so the service
 * replays what was missed and nothing that has already been rendered.
 * Disconnecting no longer cancels a run, so a tab that was backgrounded,
 * suspended or navigated away from can pick the analysis back up.
 */
export async function* attachRun(
  runId: string,
  fromIndex: number,
  signal?: AbortSignal,
): AsyncGenerator<AnalysisEvent> {
  const base = requireBase();

  let response: Response;
  try {
    response = await fetch(
      `${base}/runs/${encodeURIComponent(runId)}/stream?from=${Math.max(0, fromIndex)}`,
      { headers: { Accept: "text/event-stream" }, signal },
    );
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    throw new ServiceError(`Could not reach the analyst service at ${base}.`);
  }

  if (response.status === 404) {
    throw new ServiceError(
      "That run is no longer available on the service, so it could not be resumed.",
      404,
    );
  }
  if (!response.ok) {
    throw new ServiceError(
      `The analyst service returned ${response.status} when resuming the run.`,
      response.status,
    );
  }

  yield* parseSSE(response, signal);
}

/** Stop a run for good. Closing the stream no longer does this. */
export const cancelRun = (runId: string) =>
  fetch(`${requireBase()}/runs/${encodeURIComponent(runId)}`, { method: "DELETE" }).then(
    () => undefined,
    () => undefined,
  );


// ── Plain JSON endpoints ─────────────────────────────────────────────────

export interface MethodologyMeta {
  id: string;
  name: string;
  family: string;
  purpose: string;
  description: string;
  requiredInputs: string[];
  optionalInputs: string[];
  applicableStages: string[];
  baseConfidence: number;
  limitations: string[];
  priority: number;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${requireBase()}${path}`, init);
  if (!response.ok) {
    throw new ServiceError(`The analyst service returned ${response.status} for ${path}.`, response.status);
  }
  return (await response.json()) as T;
}

const postJson = <T,>(path: string, body: unknown): Promise<T> =>
  getJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** The registry, plus the tool vocabulary the inspector labels nodes with. */
export interface RegistryResponse {
  methodologies: MethodologyMeta[];
  tools: Record<string, string>;
  methodologyTools: Record<string, string[]>;
}

export const fetchRegistryFull = () => getJson<RegistryResponse>("/registry");

export const fetchRegistry = () =>
  fetchRegistryFull().then((data) => data.methodologies);

export const fetchGraph = () => getJson<AgentGraphData>("/graph");

// ── Command bar ──────────────────────────────────────────────────────────

/**
 * What the orchestrator decided a natural-language instruction means.
 *
 * The service compiles the instruction but does not run it, so the user sees
 * the workflow that is about to execute and can edit it first.
 */
export interface CommandPlan {
  intent: string;
  goal: string;
  name: string;
  /** One or two sentences on what is about to run and why. */
  reply: string;
  methodologyIds: string[];
  approvals: string[];
  needsStartup: boolean;
  /** Non-empty when the instruction was too vague to compile. */
  clarification: string;
  /** True when the model was unavailable and keyword matching was used. */
  fallback: boolean;
  workflow: WorkflowSpec;
}

/** The team's own agents go with the instruction, so the compiler can name
 *  them in the workflow it returns. Omit them and an instruction that asks for
 *  one compiles to a workflow that silently leaves it out. */
export const compileCommand = (
  command: string,
  startup?: unknown,
  customAgents: CustomAgent[] = [],
) => postJson<CommandPlan>("/command", { command, startup: startup ?? null, customAgents });

// ── Ask ──────────────────────────────────────────────────────────────────

/** One turn of the conversation, as the service expects it. */
export interface AskTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * What an answer may be grounded in.
 *
 * Assembled by the page from the live run, so a question asked while the
 * analysis is still going sees the results that exist so far. Every field is
 * optional: asking before anything has run is a supported case, and the
 * service says so in its answer rather than failing.
 */
export interface AskContext {
  startupName?: string;
  narrative?: string;
  profile?: StartupProfile | null;
  results?: Record<string, MethodologyResult>;
  reconciled?: ReconciledValuation | null;
  thesis?: InvestmentThesis | null;
  critique?: Critique | null;
  disagreements?: Disagreement[];
}

export interface AskReply {
  answer: string;
  /** What the answer rested on, shown beneath it so a claim can be checked. */
  basis: string[];
  /** False when the answer is not drawn from this company's material. */
  grounded: boolean;
  /** True when the model could not be reached, so this is not an answer. */
  degraded: boolean;
}

/**
 * Ask a question about the company under analysis.
 *
 * Read-only: it cannot start a run or change a result, so it is safe to call
 * at any point, including while an analysis is streaming.
 */
export const askAboutCompany = (
  question: string,
  company: AskContext,
  history: AskTurn[] = [],
) => postJson<AskReply>("/ask", { question, company, history });


// ── Screened briefs ──────────────────────────────────────────────────────

/** What the browser extension screened from a company's website. */
export interface ScreenedBrief {
  startupName: string;
  narrative: string;
  sourceUrl: string;
}

/**
 * Collect a brief the extension left on the service.
 *
 * The page text is far too large to pass through a URL, so the extension
 * hands over an id and the app fetches the brief behind it. Briefs expire,
 * which is why this can legitimately 404.
 */
export const fetchScreenedBrief = (briefId: string) =>
  getJson<ScreenedBrief>(`/screen/${encodeURIComponent(briefId)}`);


// ── Workflows ────────────────────────────────────────────────────────────

export interface WorkflowsResponse {
  templates: WorkflowTemplate[];
  /** Every registry methodology, as the builder's starting canvas. */
  default: WorkflowSpec;
}

export const fetchWorkflows = () => getJson<WorkflowsResponse>("/workflows");

// ── Runs and human checkpoints ───────────────────────────────────────────

export interface ActiveRun {
  runId: string;
  startupName: string;
  status: string;
  pendingApprovals: string[];
}

export const fetchRuns = () =>
  getJson<{ runs: ActiveRun[] }>("/runs").then((data) => data.runs);

/**
 * Resume a run paused at a checkpoint.
 *
 * The run only exists in memory on the instance executing it, so a 404 means
 * the run has finished or the instance recycled. The caller surfaces that
 * rather than retrying.
 */
export const resolveApproval = (
  runId: string,
  nodeId: string,
  approved: boolean,
  note = "",
) =>
  postJson<{ ok: boolean; runId: string; nodeId: string; approved: boolean }>(
    `/runs/${encodeURIComponent(runId)}/approve`,
    { nodeId, approved, note },
  );

export interface ServiceHealth {
  status: string;
  configured: boolean;
  mock: boolean;
  model: string | null;
  methodologies: number;
}

export const fetchHealth = () => getJson<ServiceHealth>("/health");

export interface ComparisonDimension {
  dimension: string;
  aScore10: number;
  bScore10: number;
  winner: "a" | "b" | "tie";
  reasoning: string;
}

export interface ComparisonResult {
  summary: string;
  dimensions: ComparisonDimension[];
  evidenceQualityNote: string;
  recommendedStartup: "a" | "b" | "neither";
  recommendation: string;
  reasoning: string;
  confidence: number;
  conditions: string[];
}

export const compareStartups = (a: unknown, b: unknown) =>
  getJson<ComparisonResult>("/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ a, b }),
  });
