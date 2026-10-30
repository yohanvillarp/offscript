import assert from "node:assert/strict";
import { test } from "node:test";
import { hostStorage } from "../host-storage.ts";
import { storage, seed } from "../../persistence/tests/fixtures.ts";

test("storage shutdown drains admitted asynchronous operations and denies later work", async t => {
  const db = storage(t).open(); db.migrate(); const source = await seed(db);
  let release: (() => void) | undefined;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const boundary = hostStorage({ ...db, observations: { ...db.observations, async findObservation(id) {
    await blocked; return db.observations.findObservation(id);
  } } });
  const pending = boundary.storage.observations.findObservation(source.observation.id);
  let drained = false; const drain = boundary.drain().then(() => { drained = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(drained, false);
  await assert.rejects(boundary.storage.outbox.claim({ now: 0, leaseMs: 100, limit: 1, maxAttempts: 1, token: "worker" }), /closed/);
  release?.(); await drain; assert.deepEqual(await pending, source.observation);
  await assert.rejects(boundary.storage.observations.findObservation(source.observation.id), /closed/);
});
