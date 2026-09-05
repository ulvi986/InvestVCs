// Session persistence.
//
// Writes are best-effort by design: a database hiccup must never abort an
// analysis the user is watching. Failures are logged and surfaced as a
// "not saved" state rather than thrown into the pipeline.

import { supabase } from "@/integrations/supabase/client";
import type {
  AgentRun, AnalysisPlan, AnalysisSession, Critique, Disagreement, EvidenceRef,
  InputBundle, InvestmentThesis, MethodologyResult, ReconciledValuation,
  SessionMode, SessionStatus, StartupProfile,
} from "./types";

const TABLE = "analysis_sessions";
const RUNS_TABLE = "analysis_agent_runs";
const EVIDENCE_TABLE = "analysis_evidence";

export interface SessionRow {
  id: string;
  user_id: string;
  startup_name: string;
  mode: SessionMode;
  status: SessionStatus;
  input_bundle: InputBundle;
  startup_profile: StartupProfile | null;
  analysis_plan: AnalysisPlan | null;
  methodology_results: Record<string, MethodologyResult>;
  disagreements: Disagreement[];
  reconciled_valuation: ReconciledValuation | null;
  critique: Critique | null;
  final_thesis: InvestmentThesis | null;
  iteration: number;
  degradations: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function rowToSession(row: SessionRow, runs: AgentRun[] = []): AnalysisSession {
  return {
    id: row.id,
    userId: row.user_id,
    startupName: row.startup_name,
    mode: row.mode,
    status: row.status,
    inputBundle: row.input_bundle,
    profile: row.startup_profile,
    plan: row.analysis_plan,
    results: row.methodology_results ?? {},
    disagreements: row.disagreements ?? [],
    reconciled: row.reconciled_valuation,
    critique: row.critique,
    thesis: row.final_thesis,
    runs,
    iteration: row.iteration ?? 0,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function createSession(input: {
  userId: string;
  startupName: string;
  mode: SessionMode;
  bundle: InputBundle;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: input.userId,
      startup_name: input.startupName || "Untitled startup",
      mode: input.mode,
      status: "queued",
      input_bundle: input.bundle as any,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createSession failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export interface SessionPatch {
  status?: SessionStatus;
  startupName?: string;
  profile?: StartupProfile | null;
  plan?: AnalysisPlan | null;
  results?: Record<string, MethodologyResult>;
  disagreements?: Disagreement[];
  reconciled?: ReconciledValuation | null;
  critique?: Critique | null;
  thesis?: InvestmentThesis | null;
  iteration?: number;
  degradations?: string[];
  error?: string | null;
  bundle?: InputBundle;
  completed?: boolean;
}

export async function patchSession(sessionId: string, patch: SessionPatch): Promise<boolean> {
  if (!sessionId) return false;

  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.startupName !== undefined) row.startup_name = patch.startupName;
  if (patch.profile !== undefined) row.startup_profile = patch.profile;
  if (patch.plan !== undefined) row.analysis_plan = patch.plan;
  if (patch.results !== undefined) row.methodology_results = patch.results;
  if (patch.disagreements !== undefined) row.disagreements = patch.disagreements;
  if (patch.reconciled !== undefined) row.reconciled_valuation = patch.reconciled;
  if (patch.critique !== undefined) row.critique = patch.critique;
  if (patch.thesis !== undefined) row.final_thesis = patch.thesis;
  if (patch.iteration !== undefined) row.iteration = patch.iteration;
  if (patch.degradations !== undefined) row.degradations = patch.degradations;
  if (patch.error !== undefined) row.error = patch.error;
  if (patch.bundle !== undefined) row.input_bundle = patch.bundle;
  if (patch.completed) row.completed_at = new Date().toISOString();

  if (!Object.keys(row).length) return true;

  const { error } = await supabase.from(TABLE).update(row as any).eq("id", sessionId);
  if (error) {
    console.error("patchSession failed:", error.message);
    return false;
  }
  return true;
}

/** Upsert one agent run. Called on every status change, so it must be cheap. */
export async function saveAgentRun(userId: string, run: AgentRun): Promise<void> {
  if (!userId || !run.sessionId) return;
  const { error } = await supabase.from(RUNS_TABLE).upsert(
    {
      id: run.id,
      session_id: run.sessionId,
      user_id: userId,
      agent: run.agent,
      methodology_id: run.methodologyId,
      label: run.label,
      status: run.status,
      iteration: run.iteration,
      input: run.input as any,
      output: run.output as any,
      confidence: run.confidence,
      error: run.error,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      duration_ms: run.durationMs,
    } as any,
    { onConflict: "id" },
  );
  if (error) console.error("saveAgentRun failed:", error.message);
}

export async function saveEvidence(
  userId: string,
  sessionId: string,
  evidence: EvidenceRef[],
): Promise<void> {
  if (!userId || !sessionId || !evidence.length) return;

  // Replace rather than append, so re-running a methodology does not leave the
  // superseded claims behind in the ledger.
  await supabase.from(EVIDENCE_TABLE).delete().eq("session_id", sessionId);

  const rows = evidence.map((item) => ({
    session_id: sessionId,
    user_id: userId,
    claim: item.claim,
    evidence: item.evidence,
    source: item.source,
    source_type: item.sourceType,
    confidence: item.confidence,
    methodology: item.methodology,
    reasoning: item.reasoning,
  }));

  // Chunked so a large analysis does not hit the request size limit.
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from(EVIDENCE_TABLE).insert(rows.slice(i, i + 200) as any);
    if (error) {
      console.error("saveEvidence failed:", error.message);
      return;
    }
  }
}

export async function listSessions(userId: string, limit = 25): Promise<AnalysisSession[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listSessions failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as SessionRow[]).map((row) => rowToSession(row));
}

export async function loadSession(sessionId: string): Promise<AnalysisSession | null> {
  const [sessionRes, runsRes] = await Promise.all([
    supabase.from(TABLE).select("*").eq("id", sessionId).maybeSingle(),
    supabase.from(RUNS_TABLE).select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
  ]);

  if (sessionRes.error || !sessionRes.data) {
    if (sessionRes.error) console.error("loadSession failed:", sessionRes.error.message);
    return null;
  }

  const runs: AgentRun[] = ((runsRes.data ?? []) as any[]).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    agent: row.agent,
    methodologyId: row.methodology_id,
    label: row.label,
    status: row.status,
    iteration: row.iteration,
    input: row.input,
    output: row.output,
    confidence: row.confidence,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
  }));

  return rowToSession(sessionRes.data as unknown as SessionRow, runs);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase.from(TABLE).delete().eq("id", sessionId);
  if (error) {
    console.error("deleteSession failed:", error.message);
    return false;
  }
  return true;
}
