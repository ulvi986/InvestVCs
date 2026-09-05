// Live connection state for the analyst service.
//
// "Configured" and "reachable" are different problems with different fixes,
// and the UI was conflating them: a build with no URL and a service that is
// simply not running both showed the same message. This hook separates them
// and re-checks, so starting the service makes the app recover on its own
// instead of needing a reload.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceHealth } from "@/lib/analyst/service";
import { AI_SERVICE_URL, fetchHealth, isServiceConfigured } from "@/lib/analyst/service";

export type ServiceState = "checking" | "online" | "offline" | "unconfigured";

export interface ServiceStatus {
  state: ServiceState;
  health: ServiceHealth | null;
  /** Plain sentence naming what is wrong, or null when it is fine. */
  problem: string | null;
  /** The command that fixes it, when there is one. */
  remedy: string | null;
  recheck: () => void;
}

/** How often to re-check while the service is down. */
const RETRY_MS = 5000;

export function useServiceHealth(): ServiceStatus {
  const configured = isServiceConfigured();
  const [state, setState] = useState<ServiceState>(configured ? "checking" : "unconfigured");
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const timer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const check = useCallback(async () => {
    if (!configured) {
      setState("unconfigured");
      return;
    }
    try {
      const result = await fetchHealth();
      if (!mounted.current) return;
      setHealth(result);
      setState("online");
    } catch {
      if (!mounted.current) return;
      setHealth(null);
      setState("offline");
    }
  }, [configured]);

  useEffect(() => {
    void check();
  }, [check]);

  // Keep retrying while it is down, so the app recovers by itself once the
  // service comes up. This has to be an interval rather than a timeout that
  // reschedules itself from the state: a failed re-check sets "offline" over
  // "offline", React bails out of the render, the effect never re-runs, and
  // exactly one retry would ever happen. Stops once online; nothing here polls
  // a healthy service.
  useEffect(() => {
    if (state !== "offline") return;
    timer.current = window.setInterval(() => void check(), RETRY_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [state, check]);

  const problem =
    state === "unconfigured"
      ? "The analyst service address is not set for this build."
      : state === "offline"
        ? `The analyst service is not answering at ${AI_SERVICE_URL}.`
        : null;

  const remedy =
    state === "unconfigured"
      ? "Set VITE_AI_SERVICE_URL to the deployed service and rebuild."
      : state === "offline"
        ? "Start it with: npm run ai"
        : null;

  return { state, health, problem, remedy, recheck: check };
}
