"""Registry of in-flight runs.

An approval decision arrives on a different request from the one streaming the
run, so the orchestrator has to be reachable by id between them.

This is deliberately in-process: correct for a single service instance, which
is how this deploys today. Behind more than one replica an approval could land
on a replica that is not running the analysis — at that point this needs to
move to Redis or a database queue. The failure is visible (the approval is
rejected as unknown) rather than silent.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from .orchestrator import Orchestrator

log = logging.getLogger("investvcs.runs")

_RUNS: dict[str, Orchestrator] = {}
_LOCK = asyncio.Lock()


async def register(orchestrator: Orchestrator) -> None:
    async with _LOCK:
        _RUNS[orchestrator.run_id] = orchestrator


async def release(run_id: str) -> None:
    async with _LOCK:
        _RUNS.pop(run_id, None)


def get(run_id: str) -> Optional[Orchestrator]:
    return _RUNS.get(run_id)


def active() -> list[dict]:
    return [
        {
            "runId": run_id,
            "workflow": orchestrator.workflow.name,
            "pendingApprovals": orchestrator.pending_approvals,
        }
        for run_id, orchestrator in _RUNS.items()
    ]
