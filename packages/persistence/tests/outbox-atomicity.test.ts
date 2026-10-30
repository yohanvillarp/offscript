import assert from "node:assert/strict";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { deserializeSemanticEvent } from "../../contracts/index.ts";
import { migrateDatabase } from "../migrate.ts";
import { fixture, seed, storage } from "./fixtures.ts";
import { assignmentEvent, requestEvent } from "./outbox-fixtures.ts";

test("request and assignment commit snapshots and exact pending events; duplicate identities never overwrite", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = fixture();
  await db.simulations.createSimulation(source.simulation);
  await db.observations.createObservation(source.observation);
  const event = requestEvent(source);
  assert.equal(await db.investigations.commitRequest(event), "created");
  assert.equal(await db.investigations.commitRequest(event), "duplicate");
  assert.equal(await db.investigations.commitRequest({ ...event, correlationId: "different" }), "event-conflict");
  assert.equal(await db.investigations.commitRequest({ ...event, eventId: "other" }), "already-exists");
  const assigned = assignmentEvent(source);
  assert.equal(await db.investigations.commitAssignment(assigned, 0), "saved");
  assert.equal(await db.investigations.commitAssignment(assigned, 0), "duplicate");
  assert.equal(await db.investigations.commitAssignment({ ...assigned, eventId: "loser" }, 0), "conflict");
  assert.equal(await db.outbox.inspect("loser"), undefined);
  const row = await db.outbox.inspect(assigned.eventId); assert.ok(row);
  assert.equal(row.revision, 1); assert.equal(row.status, "pending");
  assert.deepEqual(deserializeSemanticEvent(row.eventJson), assigned);
  assert.deepEqual(await db.investigations.findInvestigation(source.investigation.id), { investigation: assigned.payload.investigation, revision: 1 });
});

for (const operation of ["request", "assignment"] as const) {
  test(`outbox insertion failure rolls back the entire ${operation} snapshot`, async t => {
    const temp = storage(t); const db = temp.open(); db.migrate(); const source = fixture();
    await db.simulations.createSimulation(source.simulation);
    await db.observations.createObservation(source.observation);
    if (operation === "assignment") await db.investigations.createInvestigation(source.investigation);
    temp.raw().client.exec("CREATE TRIGGER reject_outbox BEFORE INSERT ON event_outbox BEGIN SELECT RAISE(ABORT, 'injected failure'); END;");
    const event = operation === "request" ? requestEvent(source) : assignmentEvent(source);
    if (event.type === "investigation.requested") await assert.rejects(db.investigations.commitRequest(event));
    else await assert.rejects(db.investigations.commitAssignment(event, 0));
    assert.equal(await db.outbox.inspect(event.eventId), undefined);
    assert.deepEqual(await db.investigations.findInvestigation(source.investigation.id),
      operation === "request" ? undefined : { investigation: source.investigation, revision: 0 });
  });
}

test("pending events and assignments survive reopen without executing any agents", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const event = assignmentEvent(source);
  await db.investigations.commitAssignment(event, 0);
  db.close();
  const reopened = temp.open(); reopened.migrate();
  assert.equal((await reopened.outbox.inspect(event.eventId))?.status, "pending");
  assert.equal((await reopened.investigations.findInvestigation(source.investigation.id))?.revision, 1);
});

test("upgrading the original schema preserves snapshots and never backfills events", async t => {
  const temp = storage(t); const raw = temp.raw();
  const copy = join(temp.root, "initial-only");
  cpSync(fileURLToPath(new URL("../migrations", import.meta.url)), copy, { recursive: true });
  const journalPath = join(copy, "meta", "_journal.json");
  const journal: { entries: unknown[] } = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.slice(0, 1); writeFileSync(journalPath, JSON.stringify(journal));
  migrateDatabase(raw.db, copy);
  const db = temp.open(); const source = await seed(db);
  db.migrate();
  assert.deepEqual(await db.investigations.findInvestigation(source.investigation.id), { investigation: source.investigation, revision: 0 });
  assert.deepEqual(await db.outbox.claim({ now: 0, leaseMs: 100, limit: 10, maxAttempts: 3, token: "upgrade" }), []);
});
