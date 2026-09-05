"""A run must outlive the browser that started it.

The reported symptom was losing work by switching windows during an analysis.
The cause was structural: the pipeline was driven by the HTTP response
generator, so anything that closed the connection - a backgrounded tab, a
navigation, a dropped Wi-Fi - cancelled the run and discarded minutes of model
time with no way to get it back.

These tests pin the property that fixes it: a reader disconnecting is not the
run ending, and a client can come back and collect what it missed.
"""

from __future__ import annotations

import asyncio

import pytest

from app import runs


class FakeOrchestrator:
    """Emits a fixed script of events, pausing where told to.

    Standing in for the real orchestrator keeps these tests about the registry's
    lifecycle rather than about model output.
    """

    def __init__(self, run_id="run_test", count=5, gate=None):
        self.run_id = run_id
        self.workflow = type("W", (), {"name": "Test workflow"})()
        self.pending_approvals = []
        self._count = count
        self._gate = gate
        self.cancelled = False

    async def stream(self):
        for index in range(self._count):
            if self._gate is not None and index == 2:
                try:
                    await self._gate.wait()
                except asyncio.CancelledError:
                    self.cancelled = True
                    raise
            yield {"type": "log", "payload": {"i": index}}


@pytest.fixture(autouse=True)
def clean_registry():
    runs._RUNS.clear()
    yield
    for session in list(runs._RUNS.values()):
        session.cancel()
    runs._RUNS.clear()


async def collect(session, start=0, limit=None):
    got = []
    async for event in session.subscribe(start):
        got.append(event)
        if limit is not None and len(got) >= limit:
            break
    return got


async def test_a_reader_leaving_does_not_stop_the_run():
    gate = asyncio.Event()
    session = await runs.register(FakeOrchestrator(count=5, gate=gate))

    # A client reads the first two events and then goes away.
    first = await collect(session, 0, limit=2)
    assert len(first) == 2

    # Whatever the run was waiting on completes while nobody is listening.
    gate.set()
    await asyncio.wait_for(session.done.wait(), timeout=2)

    assert not session.orchestrator.cancelled, "the pipeline was cancelled when the reader left"
    assert len(session.history) == 5


async def test_a_returning_client_replays_only_what_it_missed():
    session = await runs.register(FakeOrchestrator(count=5))
    await asyncio.wait_for(session.done.wait(), timeout=2)

    resumed = await collect(session, 2)
    assert [event["payload"]["i"] for event in resumed] == [2, 3, 4]


async def test_a_returning_client_can_replay_the_whole_run():
    session = await runs.register(FakeOrchestrator(count=4))
    await asyncio.wait_for(session.done.wait(), timeout=2)
    assert [event["payload"]["i"] for event in await collect(session, 0)] == [0, 1, 2, 3]


async def test_reattaching_mid_run_receives_the_rest_live():
    """The interesting case: reconnect while the run is still going."""
    gate = asyncio.Event()
    session = await runs.register(FakeOrchestrator(count=5, gate=gate))

    await collect(session, 0, limit=2)

    async def finish_shortly():
        await asyncio.sleep(0.01)
        gate.set()

    asyncio.create_task(finish_shortly())

    rest = await asyncio.wait_for(collect(session, 2), timeout=2)
    assert [event["payload"]["i"] for event in rest] == [2, 3, 4]


async def test_two_clients_can_read_the_same_run():
    """A second tab is a second reader, not a second run."""
    session = await runs.register(FakeOrchestrator(count=4))
    a, b = await asyncio.gather(collect(session, 0), collect(session, 0))
    assert a == b
    assert len(a) == 4


async def test_an_event_arriving_between_polls_is_not_missed():
    """Guards the subscribe loop's wake-up: the tick is captured before the
    history is drained, so an append in that window still wakes the reader."""
    gate = asyncio.Event()
    session = await runs.register(FakeOrchestrator(count=3, gate=gate))
    gate.set()
    assert len(await asyncio.wait_for(collect(session, 0), timeout=2)) == 3


async def test_cancelling_is_explicit_and_does_stop_the_run():
    gate = asyncio.Event()
    session = await runs.register(FakeOrchestrator(count=5, gate=gate))
    await collect(session, 0, limit=2)

    await runs.release(session.run_id)
    await asyncio.sleep(0)

    assert runs.session(session.run_id) is None
    assert runs.get(session.run_id) is None


async def test_a_failing_run_still_closes_with_an_error_event():
    """A subscriber must never hang waiting for a run that has already died."""

    class Exploding(FakeOrchestrator):
        async def stream(self):
            yield {"type": "log", "payload": {"i": 0}}
            raise RuntimeError("model unavailable")

    session = await runs.register(Exploding())
    events = await asyncio.wait_for(collect(session, 0), timeout=2)

    assert events[-1]["type"] == "error"
    assert "model unavailable" in events[-1]["payload"]["message"]
    assert session.done.is_set()


async def test_the_run_stays_reachable_for_approvals_while_it_streams():
    gate = asyncio.Event()
    session = await runs.register(FakeOrchestrator(run_id="run_appr", count=5, gate=gate))

    assert runs.get("run_appr") is session.orchestrator
    assert any(entry["runId"] == "run_appr" for entry in runs.active())

    gate.set()
    await asyncio.wait_for(session.done.wait(), timeout=2)


async def test_a_finished_run_is_reported_as_finished():
    session = await runs.register(FakeOrchestrator(run_id="run_done", count=2))
    await asyncio.wait_for(session.done.wait(), timeout=2)

    entry = next(item for item in runs.active() if item["runId"] == "run_done")
    assert entry["finished"] is True
    assert entry["events"] == 2


async def test_expired_runs_are_swept_so_the_registry_does_not_grow():
    session = await runs.register(FakeOrchestrator(run_id="run_old", count=1))
    await asyncio.wait_for(session.done.wait(), timeout=2)

    session.finished_at -= runs.COMPLETED_TTL_SECONDS + 1
    assert session.expired

    runs.active()  # sweeps
    assert runs.session("run_old") is None


async def test_a_live_run_is_never_swept():
    gate = asyncio.Event()
    session = await runs.register(FakeOrchestrator(run_id="run_live", count=5, gate=gate))

    runs.active()
    assert runs.session("run_live") is not None

    gate.set()
    await asyncio.wait_for(session.done.wait(), timeout=2)
