// Coming back to a run that was still going.
//
// Found in browser QA. Starting an analysis and then reloading the page gave a
// Stop button above an empty canvas, and an Ask tab saying no analysis had run
// - while the run was in fact still executing on the service. The session row
// is written with status "running" as soon as the profile arrives, so a reload
// read "running" from the database and rendered it, but the run id lived only
// in a ref and died with the page, so there was nothing to reattach to.
//
// The service keeps a run alive after its reader goes away and replays it from
// the first event, so rejoining is possible - it just needs the id to survive
// the reload. What must never happen again is the third case: claiming a run is
// live when nothing is watching it.

import { describe, it, expect, beforeEach } from "vitest";
import {
  strandedRun,
  rememberLiveRun,
  recallLiveRun,
} from "@/hooks/useInvestmentAnalyst";

const SESSION = "sess_1";
const RUN = "run_abc";

describe("a session that was left running", () => {
  it("is rejoined when this browser remembers the run", () => {
    const resolved = strandedRun("running", RUN);
    expect(resolved.rejoin).toBe(RUN);
    expect(resolved.status).toBe("running");
    expect(resolved.error).toBeNull();
  });

  it("is rejoined while still queued, before the first stage reports", () => {
    // A row is created queued and becomes running only once the service
    // accepts the run. Reloading in the seconds between the two used to
    // read an ordinary unstarted session and abandon a live run.
    expect(strandedRun("queued", RUN).rejoin).toBe(RUN);
  });

  it("is rejoined while the run is waiting on a person", () => {
    expect(strandedRun("waiting_for_input", RUN).rejoin).toBe(RUN);
  });

  it("admits a queued row it cannot rejoin rather than offering a fresh start", () => {
    const resolved = strandedRun("queued", null);
    expect(resolved.status).toBe("failed");
    expect(resolved.error).toContain("run it again");
  });

  it("is not presented as live when there is nothing to rejoin", () => {
    // The failure this exists to prevent: a Stop button over an empty canvas.
    const resolved = strandedRun("running", null);
    expect(resolved.status).not.toBe("running");
    expect(resolved.rejoin).toBeNull();
  });

  it("says what happened, in terms of what to do next", () => {
    const resolved = strandedRun("running", null);
    expect(resolved.error).toContain("still running when the page was closed");
    expect(resolved.error).toContain("run it again");
  });
});

describe("a session that was not left running", () => {
  it("opens a completed analysis untouched", () => {
    expect(strandedRun("completed", null)).toEqual({
      status: "completed",
      rejoin: null,
      error: null,
    });
  });

  it("does not overwrite the stored reason a run failed", () => {
    expect(strandedRun("failed", null).error).toBeNull();
  });

  it("ignores a stale remembered run on a finished session", () => {
    // The id outlives the run it names; only a running row may act on it.
    expect(strandedRun("completed", RUN).rejoin).toBeNull();
  });
});

describe("remembering which run to rejoin", () => {
  beforeEach(() => localStorage.clear());

  it("survives the page going away", () => {
    rememberLiveRun(SESSION, RUN);
    expect(recallLiveRun(SESSION)).toBe(RUN);
  });

  it("is scoped to its session, so one run cannot be mistaken for another", () => {
    rememberLiveRun(SESSION, RUN);
    expect(recallLiveRun("sess_2")).toBeNull();
  });

  it("is cleared when the run ends, so a finished run is never rejoined", () => {
    rememberLiveRun(SESSION, RUN);
    rememberLiveRun(SESSION, null);
    expect(recallLiveRun(SESSION)).toBeNull();
    expect(strandedRun("running", recallLiveRun(SESSION)).rejoin).toBeNull();
  });

  it("does nothing for an unsaved session rather than writing a stray key", () => {
    rememberLiveRun(null, RUN);
    expect(Object.keys(localStorage)).toHaveLength(0);
  });
});
