// What the user is told when the analyst service refuses a request.
//
// Reported during QA: reading a website that blocks automated readers showed
// "The analyst service returned 400 for /screen." The service had actually
// said "That page returned 403. Some sites block automated readers; try the
// company's home page." - the one sentence that tells you what to do next.
// The status code alone reads as a fault in the product.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const BASE = "https://analyst.example";

async function callRegistry() {
  const { fetchRegistry, ServiceError } = await import("@/lib/analyst/service");
  try {
    await fetchRegistry();
    throw new Error("expected the call to fail");
  } catch (error) {
    if (!(error instanceof ServiceError)) throw error;
    return error;
  }
}

function refuses(status: number, body: string, contentType = "application/json") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(body, { status, headers: { "Content-Type": contentType } }),
    ),
  );
}

describe("why a request failed", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ANALYST_URL", BASE);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("says what the service said, not what the status code was", async () => {
    refuses(400, JSON.stringify({ error: "That page returned 403. Some sites block automated readers." }));
    const error = await callRegistry();
    expect(error.message).toBe("That page returned 403. Some sites block automated readers.");
    expect(error.message).not.toContain("400");
  });

  it("keeps the status on the error, so callers can still branch on it", async () => {
    refuses(429, JSON.stringify({ error: "Too many requests." }));
    expect((await callRegistry()).status).toBe(429);
  });

  it("reads FastAPI's own field as well", async () => {
    // Validation failures come back as {detail: ...}, not {error: ...}.
    refuses(422, JSON.stringify({ detail: "url: field required" }));
    expect((await callRegistry()).message).toBe("url: field required");
  });

  it("falls back to the status when the body explains nothing", async () => {
    refuses(500, "");
    const error = await callRegistry();
    expect(error.message).toContain("500");
    expect(error.message).toContain("/registry");
  });

  it("uses the first line of a gateway error page rather than its markup", async () => {
    refuses(502, "Bad gateway\n<html><body>...</body></html>", "text/html");
    const error = await callRegistry();
    expect(error.message).toBe("Bad gateway");
    expect(error.message).not.toContain("<html>");
  });

  it("does not mistake an empty error field for an explanation", async () => {
    refuses(400, JSON.stringify({ error: "   " }));
    expect((await callRegistry()).message).toContain("400");
  });
});
