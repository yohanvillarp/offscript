import assert from "node:assert/strict";
import { test } from "node:test";
import { dispatchOutboxBatch } from "../../application/index.ts";
import { fixture, seed, storage } from "./fixtures.ts";
import { assignmentEvent, claim, dispatchOptions, requestEvent } from "./outbox-fixtures.ts";

test("independent workers cannot claim the same live lease, and expired tokens cannot acknowledge a replacement", async t => {
  const temp = storage(t); const first = temp.open(); first.migrate(); const source = await seed(first);
  const second = temp.open(); const event = assignmentEvent(source);
  await first.investigations.commitAssignment(event, 0);
  const [a, b] = await Promise.all([first.outbox.claim(claim()), second.outbox.claim(claim())]);
  assert.equal(a.length + b.length, 1);
  const old = [...a, ...b][0]; assert.ok(old);
  assert.equal(await first.outbox.accept(event.eventId, old.leaseToken, 100), false);
  first.close();
  const next = (await second.outbox.claim(claim(100)))[0]; assert.ok(next);
  assert.notEqual(next.leaseToken, old.leaseToken);
  assert.equal(await second.outbox.reject(event.eventId, old.leaseToken, 101, "PUBLISH_REJECTED", null), false);
  assert.equal(await second.outbox.defer(event.eventId, old.leaseToken, 101, 102), false);
  assert.equal(await second.outbox.accept(event.eventId, next.leaseToken, 101), true);
});

test("publish before acknowledgement loss is retried with identical identity and correlation", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const event = assignmentEvent(source); await db.investigations.commitAssignment(event, 0);
  const published: unknown[] = []; let now = 0;
  const publisher = { async publish(value: unknown) { published.push(value); return "accepted" as const; } };
  // Model a worker crash after publication but before acknowledgement.
  const lease = (await db.outbox.claim(claim()))[0]; assert.ok(lease);
  await publisher.publish(event); db.close(); now = 100;
  const reopened = temp.open();
  const result = await dispatchOutboxBatch({ store: reopened.outbox, publisher, now: () => now, token: () => "retry" }, dispatchOptions);
  assert.equal(result.accepted, 1);
  assert.deepEqual(published, [event, event]);
  assert.equal((await reopened.outbox.inspect(event.eventId))?.attempts, 2);
});

test("failure backoff is bounded, exhaustion blocks successors, and other investigations progress", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = fixture();
  await db.simulations.createSimulation(source.simulation); await db.observations.createObservation(source.observation);
  const requested = requestEvent(source); const assigned = assignmentEvent(source);
  await db.investigations.commitRequest(requested); await db.investigations.commitAssignment(assigned, 0);
  const other = await seed(db, fixture("other")); await db.investigations.commitAssignment(assignmentEvent(other, "other-event"), 0);
  let now = 0; const delivered: string[] = [];
  const dependencies = { store: db.outbox, now: () => now, token: () => "worker", publisher: {
    async publish(event: { eventId: string }) {
      if (event.eventId === requested.eventId) throw new Error("Sensitive provider text must not be persisted");
      delivered.push(event.eventId); return "accepted" as const;
    },
  } };
  await dispatchOutboxBatch(dependencies, dispatchOptions);
  assert.deepEqual(delivered, ["other-event"]);
  assert.equal((await db.outbox.inspect(requested.eventId))?.availableAt, 10);
  now = 9; assert.equal((await dispatchOutboxBatch(dependencies, dispatchOptions)).claimed, 0);
  now = 10; await dispatchOutboxBatch(dependencies, dispatchOptions);
  assert.equal((await db.outbox.inspect(requested.eventId))?.availableAt, 30);
  now = 30; await dispatchOutboxBatch(dependencies, dispatchOptions);
  const failed = await db.outbox.inspect(requested.eventId);
  assert.equal(failed?.status, "failed"); assert.equal(failed.lastError, "PUBLISH_REJECTED");
  now = 999; assert.equal((await dispatchOutboxBatch(dependencies, dispatchOptions)).claimed, 0);
  assert.equal((await db.outbox.inspect(assigned.eventId))?.attempts, 0);
});

test("unavailable sessions defer without consuming retries; accepted predecessors release successors", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = fixture();
  await db.simulations.createSimulation(source.simulation); await db.observations.createObservation(source.observation);
  const requested = requestEvent(source); const assigned = assignmentEvent(source);
  await db.investigations.commitRequest(requested); await db.investigations.commitAssignment(assigned, 0);
  let now = 0; let active = false; const delivered: string[] = [];
  const dependencies = { store: db.outbox, now: () => now, token: () => "worker", publisher: {
    async publish(event: { eventId: string }) {
      if (!active) return "deferred" as const;
      delivered.push(event.eventId); return "accepted" as const;
    },
  } };
  for (let i = 0; i < 8; i++) { await dispatchOutboxBatch(dependencies, dispatchOptions); now += 5; }
  assert.equal((await db.outbox.inspect(requested.eventId))?.attempts, 0);
  active = true;
  await dispatchOutboxBatch(dependencies, dispatchOptions); await dispatchOutboxBatch(dependencies, dispatchOptions);
  assert.deepEqual(delivered, [requested.eventId, assigned.eventId]);
});

test("expired final attempts become terminal without another publication", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const event = assignmentEvent(source); await db.investigations.commitAssignment(event, 0);
  for (const now of [0, 100, 200]) assert.equal((await db.outbox.claim(claim(now))).length, 1);
  assert.deepEqual(await db.outbox.claim(claim(300)), []);
  assert.equal((await db.outbox.inspect(event.eventId))?.lastError, "ATTEMPTS_EXHAUSTED");
});
