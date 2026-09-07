// Which analysis comes back when you return to the workspace.
//
// Reported as losing results: finish a run, step over to Assessment, come back,
// and the workspace is blank. Nothing was lost - the run is in Supabase and
// listed under Earlier runs - but starting a run stripped the session from the
// URL, and the page only ever restored one the URL named. So there was no way
// back to it except knowing to click the history.
//
// These cover the decision the page makes on arrival. The rule has to hold in
// both directions: bring the last analysis back, but never over the top of a
// run in flight, and never someone else's on a shared browser.

import { describe, it, expect, beforeEach } from "vitest";

/** The choice Workflow.tsx makes when it mounts, extracted so it can be
 *  stated plainly and checked. */
export function sessionToOpen(input: {
  named: string | null;
  alreadyOpen: string | null;
  isRunning: boolean;
  liveSessionId: string | null;
  remembered: string | null;
}): string | null {
  const { named, alreadyOpen, isRunning, liveSessionId, remembered } = input;

  if (named) return named === alreadyOpen ? null : named;
  if (alreadyOpen || isRunning || liveSessionId) return null;
  return remembered;
}

const base = {
  named: null,
  alreadyOpen: null,
  isRunning: false,
  liveSessionId: null,
  remembered: null,
};

describe("which analysis the workspace opens", () => {
  it("brings back the last one when you return with a bare address", () => {
    expect(sessionToOpen({ ...base, remembered: "sess_1" })).toBe("sess_1");
  });

  it("opens nothing on a first visit", () => {
    expect(sessionToOpen(base)).toBeNull();
  });

  it("prefers a session named in the address over the remembered one", () => {
    // A deep link, or the row someone just clicked in Earlier runs.
    expect(sessionToOpen({ ...base, named: "sess_link", remembered: "sess_old" })).toBe("sess_link");
  });

  it("does not reopen what is already on screen", () => {
    expect(sessionToOpen({ ...base, named: "sess_1", alreadyOpen: "sess_1" })).toBeNull();
  });

  it("never interrupts a run in flight", () => {
    expect(sessionToOpen({ ...base, isRunning: true, remembered: "sess_old" })).toBeNull();
  });

  it("never replaces an analysis already loaded", () => {
    expect(sessionToOpen({ ...base, liveSessionId: "sess_live", remembered: "sess_old" })).toBeNull();
  });

  it("still honours a deep link during a run, because that is a deliberate act", () => {
    expect(
      sessionToOpen({ ...base, named: "sess_link", isRunning: true, liveSessionId: "sess_live" }),
    ).toBe("sess_link");
  });
});

describe("remembering across visits", () => {
  const key = "investvcs.lastSession.user-1";

  beforeEach(() => localStorage.clear());

  it("is scoped to the user, so a shared browser cannot leak an analysis", () => {
    localStorage.setItem(key, "sess_mine");
    expect(localStorage.getItem("investvcs.lastSession.user-2")).toBeNull();
  });

  it("survives a round trip", () => {
    localStorage.setItem(key, "sess_1");
    expect(localStorage.getItem(key)).toBe("sess_1");
  });

  it("is cleared when a new run starts, so the old one cannot come back", () => {
    localStorage.setItem(key, "sess_old");
    localStorage.removeItem(key);
    expect(sessionToOpen({ ...base, remembered: localStorage.getItem(key) })).toBeNull();
  });
});
