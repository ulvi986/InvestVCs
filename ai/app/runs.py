"""Registry of in-flight runs.

Two things need a run to outlive the request that started it.

An approval decision arrives on a different request from the one streaming the
run, so the orchestrator has to be reachable by id between them.

And a browser that goes away must not destroy the analysis. A run costs minutes
of model time and holds its state in process; if a backgrounded tab, a dropped
connection or a navigation cancelled the pipeline, the work would be gone with
no way to get it back. So the pipeline is driven by a task this module owns
rather than by the HTTP generator: every event is appended to a history, and a
client can reattach and replay from wherever it stopped reading.

This is deliberately in-process: correct for a single service instance, which
is how this deploys today. Behind more than one replica a reattach could land
on a replica that is not running the analysis - at that point this needs Redis
or a database. The failure is visible (the run is reported unknown) rather than
silent.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, AsyncIterator, Optional

from .orchestrator import Orchestrator

log = logging.getLogger("investvcs.runs")

#: How long a finished run stays replayable. Long enough that a client which
#: dropped near the end can still collect the thesis it paid for.
COMPLETED_TTL_SECONDS = 30 * 60

#: A run nobody is reading and which never finishes still has to be collectable.
ABANDONED_TTL_SECONDS = 2 * 60 * 60


class RunSession:
    """One analysis, its event history, and whoever is currently reading it."""

    def __init__(self, orchestrator: Orchestrator) -> None:
        self.orchestrator = orchestrator
        self.run_id = orchestrator.run_id
        self.history: list[dict[str, Any]] = []
        self.done = asyncio.Event()
        self.started_at = time.monotonic()
        self.finished_at: Optional[float] = None
        self._tick = asyncio.Event()
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._drain())

    def _notify(self) -> None:
        """Wake every subscriber. Each waits on the tick it captured, so an
        event appended between draining and awaiting is never missed."""
        tick, self._tick = self._tick, asyncio.Event()
        tick.set()

    async def _drain(self) -> None:
        try:
            async for event in self.orchestrator.stream():
                self.history.append(event)
                self._notify()
        except asyncio.CancelledError:
            self.history.append({"type": "error", "payload": {"message": "The run was cancelled."}})
            raise
        except Exception as error:  # noqa: BLE001 - a failed run must still close
            log.exception("analysis failed (run %s)", self.run_id)
            self.history.append(
                {"type": "error", "payload": {"message": str(error) or "Analysis failed."}}
            )
        finally:
            self.finished_at = time.monotonic()
            self.done.set()
            self._notify()

    async def subscribe(self, from_index: int = 0) -> AsyncIterator[dict[str, Any]]:
        """Replay from `from_index`, then follow live until the run finishes.

        Cancelling this generator disconnects one reader. It does not touch the
        run, which is the whole point.
        """
        index = max(0, from_index)
        while True:
            tick = self._tick
            while index < len(self.history):
                yield self.history[index]
                index += 1
            if self.done.is_set():
                return
            await tick.wait()

    def cancel(self) -> None:
        if self._task is not None and not self._task.done():
            self._task.cancel()

    @property
    def expired(self) -> bool:
        if self.finished_at is not None:
            return (time.monotonic() - self.finished_at) > COMPLETED_TTL_SECONDS
        return (time.monotonic() - self.started_at) > ABANDONED_TTL_SECONDS


_RUNS: dict[str, RunSession] = {}
_LOCK = asyncio.Lock()


def _sweep() -> None:
    for run_id in [run_id for run_id, session in _RUNS.items() if session.expired]:
        session = _RUNS.pop(run_id, None)
        if session is not None:
            session.cancel()
            log.info("swept run %s", run_id)


async def register(orchestrator: Orchestrator) -> RunSession:
    """Take ownership of a run and start driving it."""
    async with _LOCK:
        _sweep()
        session = RunSession(orchestrator)
        _RUNS[session.run_id] = session
    session.start()
    return session


async def release(run_id: str) -> None:
    """Drop a run outright. Used when a client cancels deliberately."""
    async with _LOCK:
        session = _RUNS.pop(run_id, None)
    if session is not None:
        session.cancel()


def session(run_id: str) -> Optional[RunSession]:
    return _RUNS.get(run_id)


def get(run_id: str) -> Optional[Orchestrator]:
    found = _RUNS.get(run_id)
    return found.orchestrator if found is not None else None


def active() -> list[dict]:
    _sweep()
    return [
        {
            "runId": run_id,
            "workflow": run.orchestrator.workflow.name,
            "pendingApprovals": run.orchestrator.pending_approvals,
            "finished": run.done.is_set(),
            "events": len(run.history),
        }
        for run_id, run in _RUNS.items()
    ]
