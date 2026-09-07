// Which copy of the interview survives.
//
// The interview lived in localStorage alone, so it was one browser's: clearing
// site data, signing in on a second machine or opening a private window all
// presented a founder who had answered nothing - while the analysis went on
// quoting the answers they had given. It is now written to the account as
// well, which means there can be two copies that differ, and something has to
// decide between them.
//
// The rule that matters is the one protecting against loss. Answers are only
// ever added, so more answers means less lost, and that beats recency: a fresh
// empty session on a new machine is always the newer of the two and is never
// the one to keep.

import { describe, it, expect } from "vitest";
import { preferred, rowToSession } from "@/lib/assessment/persistence";
import type { AssessmentSession } from "@/lib/assessment";

function session(overrides: Partial<AssessmentSession> = {}): AssessmentSession {
  return {
    id: "sess_1",
    startupName: "",
    answers: {},
    resolutions: {},
    history: [],
    startedAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

const answers = (count: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `q${index}`,
      { questionId: `q${index}`, optionId: "a", answeredAt: "2026-09-01T00:00:00.000Z" },
    ]),
  ) as AssessmentSession["answers"];

describe("choosing between two copies of an interview", () => {
  it("keeps the account copy when this browser has nothing", () => {
    // Signing in on a new machine. The empty local session is newer and loses.
    const local = session({ updatedAt: "2026-09-07T00:00:00.000Z" });
    const remote = session({ answers: answers(20), updatedAt: "2026-09-02T00:00:00.000Z" });
    expect(preferred(local, remote)).toBe(remote);
  });

  it("keeps what this browser has when the account has nothing yet", () => {
    const local = session({ answers: answers(12) });
    expect(preferred(local, null)).toBe(local);
  });

  it("keeps the account copy when there is nothing local", () => {
    const remote = session({ answers: answers(3) });
    expect(preferred(null, remote)).toBe(remote);
  });

  it("returns nothing when there is nothing either side", () => {
    expect(preferred(null, null)).toBeNull();
  });

  it("never trades answers away for a newer timestamp", () => {
    const local = session({ answers: answers(30), updatedAt: "2026-09-01T00:00:00.000Z" });
    const remote = session({ answers: answers(2), updatedAt: "2026-09-07T00:00:00.000Z" });
    expect(preferred(local, remote)).toBe(local);
  });

  it("falls back to recency when both hold the same answers", () => {
    // The ordinary case: the same interview carried on somewhere else, where
    // the later edit - a revised answer, a resolved contradiction - is right.
    const local = session({ answers: answers(9), updatedAt: "2026-09-01T00:00:00.000Z" });
    const remote = session({ answers: answers(9), updatedAt: "2026-09-05T00:00:00.000Z" });
    expect(preferred(local, remote)).toBe(remote);
  });

  it("keeps the local copy when neither is newer, so nothing flickers", () => {
    const local = session({ answers: answers(4), updatedAt: "2026-09-05T00:00:00.000Z" });
    const remote = session({ answers: answers(4), updatedAt: "2026-09-05T00:00:00.000Z" });
    expect(preferred(local, remote)).toBe(local);
  });
});

describe("reading a stored row", () => {
  const row = {
    user_id: "user-1",
    session_id: "sess_stored",
    startup_name: "Northwind",
    answers: answers(2),
    resolutions: {},
    history: ["q0", "q1"],
    started_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-04T00:00:00.000Z",
  };

  it("comes back as the session the interview works with", () => {
    const restored = rowToSession(row as never);
    expect(restored.id).toBe("sess_stored");
    expect(restored.startupName).toBe("Northwind");
    expect(Object.keys(restored.answers)).toHaveLength(2);
    expect(restored.history).toEqual(["q0", "q1"]);
  });

  it("tolerates a row written before a column had a value", () => {
    const sparse = { ...row, startup_name: null, answers: null, history: null };
    const restored = rowToSession(sparse as never);
    expect(restored.startupName).toBe("");
    expect(restored.answers).toEqual({});
    expect(restored.history).toEqual([]);
  });

  it("does not carry a stored opinion about being finished", () => {
    // Completion is derived from the answers; a second opinion could disagree.
    expect(rowToSession({ ...row, completed_at: "2026-09-04T00:00:00.000Z" } as never).completedAt)
      .toBeNull();
  });
});
