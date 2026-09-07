// The founder interview, in the account rather than in one browser.
//
// Local storage keeps the interview instant and keeps it working offline; the
// database is what makes it survive a cleared cache, a second machine or a
// private window. Local is written first and read first, so nothing about
// answering a question waits on the network, and the row is what wins when the
// two disagree about which is newer.

import { supabase } from "@/integrations/supabase/client";
import type { AssessmentSession } from "./types";

const TABLE = "assessment_interviews";

interface InterviewRow {
  user_id: string;
  session_id: string;
  startup_name: string;
  answers: AssessmentSession["answers"];
  resolutions: AssessmentSession["resolutions"];
  history: AssessmentSession["history"];
  started_at: string;
  updated_at: string;
}

export function rowToSession(row: InterviewRow): AssessmentSession {
  return {
    id: row.session_id,
    startupName: row.startup_name ?? "",
    answers: row.answers ?? {},
    resolutions: row.resolutions ?? {},
    history: row.history ?? [],
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    // The interview is complete when every applicable question is answered,
    // which the engine decides from the answers. Storing a second opinion
    // about it would only create something to disagree with.
    completedAt: null,
  };
}

/** The stored interview, or null when there is none or it cannot be read. */
export async function loadInterview(userId: string): Promise<AssessmentSession | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("loadInterview failed:", error.message);
    return null;
  }
  return data ? rowToSession(data as unknown as InterviewRow) : null;
}

/**
 * Write the interview back.
 *
 * Best-effort, like the analysis writes: a database that is unreachable must
 * not cost the founder the answer they just gave, which local storage already
 * holds. Returns whether it landed so the page can say when it did not.
 */
export async function saveInterview(userId: string, session: AssessmentSession): Promise<boolean> {
  if (!userId) return false;

  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      session_id: session.id,
      startup_name: session.startupName ?? "",
      answers: session.answers as never,
      resolutions: session.resolutions as never,
      history: session.history as never,
      started_at: session.startedAt,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("saveInterview failed:", error.message);
    return false;
  }
  return true;
}

export async function deleteInterview(userId: string): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from(TABLE).delete().eq("user_id", userId);
  if (error) console.error("deleteInterview failed:", error.message);
}

/**
 * Which of the two copies to keep.
 *
 * They differ whenever a browser was offline, or a second one was used, or the
 * cache was cleared. Answers are only ever added, so the copy with more of
 * them is the one that has not lost anything - and that beats the timestamp,
 * because a fresh empty session on a new machine is always the newer of the
 * two and is never the one to keep. Time settles it only when both hold the
 * same number of answers, which is the ordinary case of the same interview
 * carried on somewhere else.
 */
export function preferred(
  local: AssessmentSession | null,
  remote: AssessmentSession | null,
): AssessmentSession | null {
  if (!local) return remote;
  if (!remote) return local;

  const localAnswers = Object.keys(local.answers ?? {}).length;
  const remoteAnswers = Object.keys(remote.answers ?? {}).length;
  if (localAnswers !== remoteAnswers) return localAnswers > remoteAnswers ? local : remote;

  return Date.parse(remote.updatedAt ?? "") > Date.parse(local.updatedAt ?? "") ? remote : local;
}
