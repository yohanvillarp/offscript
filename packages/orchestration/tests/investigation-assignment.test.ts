import assert from "node:assert/strict";
import { test } from "node:test";
import { ApplicationError } from "../../application/index.ts";
import { assignInvestigation, completeInvestigation } from "../../domain/index.ts";
import { flush, reactionContext } from "./assignment-reaction-context.ts";

test("handler saves participation and publishes assignment before admitting the reactive turn", async () => {
  const context = reactionContext();
  const event = context.event();
  let checked = false;
  context.publish.event = (assigned) => {
    const stored = [...context.state.investigations.values()][0];
    assert.equal(stored?.investigation.lifecycle.status, "assigned");
    assert.equal(context.started.length, 0);
    assert.equal(assigned.correlationId, "original-correlation");
    assert.deepEqual(assigned.origin, { kind: "agent", agentId: context.id });
    checked = true;
    context.published.push(assigned);
  };
  context.apply(event);
  context.apply(event);
  await flush(context.state);
  assert.ok(checked);
  assert.equal(context.started.length, 1);
  assert.equal(context.published.length, 1);
  assert.equal(context.state.turns.get(context.id)?.reservations, 0);
  assert.equal(context.state.failures.length, 0);
});

test("busy agents queue only after successful assignment; agents without capacity are not assigned", async () => {
  const context = reactionContext(1);
  const turn = context.state.turns.get(context.id);
  assert.ok(turn);
  turn.busy = true;
  context.apply(context.event());
  await flush(context.state);
  assert.equal(turn.pending.length, 1);
  assert.equal(context.started.length, 0);
  assert.equal(context.published[0]?.type, "investigation.assigned");
  const exhausted = reactionContext(1);
  const exhaustedTurn = exhausted.state.turns.get(exhausted.id);
  assert.ok(exhaustedTurn);
  exhaustedTurn.turns = 1;
  exhausted.apply(exhausted.event());
  await flush(exhausted.state);
  assert.equal(exhausted.published.length, 0);
  assert.equal([...exhausted.state.investigations.values()][0]?.revision, 0);
});

for (const outcome of ["conflict", "not-found", "throw"] as const) {
  test(`assignment ${outcome} never starts a turn or queues work and is not retried`, async () => {
    const context = reactionContext();
    let attempts = 0;
    context.store.saveAssignment = async () => {
      attempts++;
      if (outcome === "throw") throw new Error("Save failed");
      return outcome;
    };
    context.apply(context.event());
    await flush(context.state);
    assert.equal(attempts, 1);
    assert.equal(context.started.length, 0);
    assert.equal(context.state.turns.get(context.id)?.pending.length, 0);
    assert.equal(context.state.turns.get(context.id)?.reservations, 0);
    assert.equal(context.published.length, 0);
    assert.equal(context.state.failures[0]?.stage, "investigation-assignment");
  });
}

test("completed investigations cannot start work, and fabricated requests cannot bypass stored state", async () => {
  const context = reactionContext();
  const event = context.event();
  const record = [...context.state.investigations.values()][0];
  assert.ok(record);
  const assigned = assignInvestigation(record.investigation, [context.id], new Date().toISOString());
  const completed = completeInvestigation(assigned, { outcome: "inconclusive", explanation: "No conclusion", evidenceIds: [] }, context.id, assigned.lifecycle.assignedAt);
  context.state.investigations.set(completed.id, { investigation: completed, revision: 2 });
  context.apply(event);
  await flush(context.state);
  assert.equal(context.started.length, 0);
  const missing = reactionContext();
  const fabricated = missing.event();
  missing.state.investigations.clear();
  missing.apply(fabricated);
  await flush(missing.state);
  assert.equal(missing.started.length, 0);
  const error = missing.state.failures[0]?.cause;
  assert.ok(error instanceof ApplicationError && error.code === "INVESTIGATION_NOT_FOUND");
});

test("unconfirmed publication may start work after the assignment was saved", async () => {
  const context = reactionContext();
  context.publish.event = () => { throw new Error("Publication uncertain"); };
  context.apply(context.event());
  await flush(context.state);
  assert.equal(context.started.length, 1);
  assert.equal([...context.state.investigations.values()][0]?.revision, 1);
  assert.equal(context.state.failures[0]?.stage, "assignment-publication");
});

test("closing during assignment prevents new work even when the save already succeeded", async () => {
  const context = reactionContext();
  const save = context.store.saveAssignment;
  context.store.saveAssignment = async (...args) => {
    const result = await save(...args);
    context.state.closed = true;
    return result;
  };
  context.apply(context.event());
  await flush(context.state);
  assert.equal(context.started.length, 0);
  assert.equal(context.state.turns.get(context.id)?.reservations, 0);
  assert.equal([...context.state.investigations.values()][0]?.revision, 1);
});

test("each simultaneous assignment callback releases only its own reservation", async () => {
  const context = reactionContext(2);
  const first = context.event("first");
  const second = context.event("second");
  const read = context.store.findInvestigation;
  let release: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  context.store.findInvestigation = async (id) => {
    if (id === "second") await blocked;
    return read(id);
  };
  context.apply(first);
  context.apply(second);
  for (let index = 0; index < 30 && !context.started.length; index++) await new Promise((resolve) => setImmediate(resolve));
  const turn = context.state.turns.get(context.id);
  assert.ok(turn);
  assert.equal(context.started.length, 1);
  assert.equal(turn.reservations, 1);
  release?.();
  await flush(context.state);
  assert.equal(turn.reservations, 0);
  assert.equal(turn.pending.length, 1);
  assert.equal(context.published.length, 2);
});
