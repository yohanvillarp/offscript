import assert from "node:assert/strict";
import { test } from "node:test";
import { dispatchOutboxBatch, validateDispatch } from "../../application/index.ts";
import { fixture, seed, storage } from "./fixtures.ts";
import { assignmentEvent, claim, dispatchOptions } from "./outbox-fixtures.ts";

for (const field of ["event_json", "event_id", "revision", "simulation"] as const) {
  test(`corrupt outbox ${field} is terminal and never published`, async t => {
    const temp = storage(t); const db = temp.open(); db.migrate(); const source = await seed(db);
    const event = assignmentEvent(source); await db.investigations.commitAssignment(event, 0);
    const raw = temp.raw();
    if (field === "event_json") raw.client.prepare("UPDATE event_outbox SET event_json = ?").run('{"type":"unknown.event"}');
    if (field === "event_id") raw.client.prepare("UPDATE event_outbox SET event_id = ?").run("tampered");
    if (field === "revision") raw.client.exec("UPDATE event_outbox SET revision = 0");
    if (field === "simulation") raw.client.prepare("UPDATE event_outbox SET event_json = ?").run(JSON.stringify({ ...event, simulationId: "other" }));
    let calls = 0;
    const result = await dispatchOutboxBatch({ store: db.outbox, now: () => 0, token: () => "worker",
      publisher: { async publish() { calls++; return "accepted"; } } }, dispatchOptions);
    assert.equal(calls, 0); assert.equal(result.rejected, 1);
    const row = await db.outbox.inspect(field === "event_id" ? "tampered" : event.eventId);
    assert.equal(row?.status, "failed"); assert.equal(row.lastError, "INVALID_EVENT");
  });
}

test("leases expiring during a batch are neither acknowledged nor used for later publication", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  for (const name of ["first", "second"]) {
    const source = await seed(db, fixture(name)); await db.investigations.commitAssignment(assignmentEvent(source, name), 0);
  }
  let now = 0; let calls = 0;
  const result = await dispatchOutboxBatch({ store: db.outbox, now: () => now, token: () => "worker",
    publisher: { async publish() { calls++; now = 100; return "accepted"; } } }, dispatchOptions);
  assert.equal(calls, 1); assert.equal(result.stale, 2);
  assert.equal((await db.outbox.inspect("first"))?.status, "leased");
  assert.equal((await db.outbox.claim(claim(100))).length, 2);
});

test("acknowledgement failure is propagated without misclassifying accepted publication as rejection", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const event = assignmentEvent(source); await db.investigations.commitAssignment(event, 0);
  const cause = new Error("Database acknowledgement failed"); let calls = 0;
  await assert.rejects(dispatchOutboxBatch({ now: () => 0, token: () => "worker",
    store: { ...db.outbox, async accept() { throw cause; } },
    publisher: { async publish() { calls++; return "accepted"; } } }, dispatchOptions), error => error === cause);
  assert.equal(calls, 1);
  const row = await db.outbox.inspect(event.eventId);
  assert.equal(row?.status, "leased"); assert.equal(row.lastError, null);
});

test("invalid claim and dispatch limits are rejected before acquiring leases", async t => {
  const db = storage(t).open(); db.migrate(); const source = await seed(db);
  const event = assignmentEvent(source); await db.investigations.commitAssignment(event, 0);
  for (const patch of [{ now: -1 }, { token: " " }, { leaseMs: 0 }, { leaseMs: Number.MAX_SAFE_INTEGER }, { limit: 101 }, { maxAttempts: 0 }]) {
    await assert.rejects(db.outbox.claim({ ...claim(1), ...patch }));
  }
  for (const patch of [{ leaseMs: -1 }, { batchSize: 101 }, { retryBaseMs: 31 }, { maxAttempts: 101 }]) {
    assert.throws(() => validateDispatch({ ...dispatchOptions, ...patch }));
  }
  assert.equal((await db.outbox.inspect(event.eventId))?.attempts, 0);
});
