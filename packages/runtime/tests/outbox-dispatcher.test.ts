import assert from "node:assert/strict";
import { test } from "node:test";
import { createOutboxDispatcher } from "../index.ts";
import { createMemoryOutbox } from "../../orchestration/memory-outbox.ts";
import { executeRequestInvestigation } from "../../application/index.ts";
import { command, memoryContext } from "../../application/tests/memory-context.ts";

async function queue() {
  const outbox = createMemoryOutbox();
  const event = (await executeRequestInvestigation(command(), memoryContext().dependencies)).event;
  outbox.append(event, 0);
  return { outbox, event };
}

test("concurrent ticks share one batch and stop waits for current publication", async () => {
  const { outbox, event } = await queue();
  let release: (() => void) | undefined; let calls = 0;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const dispatcher = createOutboxDispatcher({ store: outbox.store, publisher: {
    async publish() { calls++; await pending; return "accepted"; },
  } });
  const first = dispatcher.runOnce(); const second = dispatcher.runOnce();
  assert.equal(first, second);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  let stopped = false; const stop = dispatcher.stop().then(() => { stopped = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(stopped, false);
  release?.(); await stop;
  assert.equal((await outbox.store.inspect(event.eventId))?.status, "accepted");
  await assert.rejects(dispatcher.runOnce(), /stopped/);
});

test("hung publication times out; late results never acknowledge the failed attempt", async () => {
  const { outbox, event } = await queue();
  let release: ((value: "accepted") => void) | undefined;
  const pending = new Promise<"accepted">(resolve => { release = resolve; });
  const dispatcher = createOutboxDispatcher({ store: outbox.store, publishTimeoutMs: 10,
    publisher: { publish: () => pending } });
  assert.equal((await dispatcher.runOnce()).rejected, 1);
  release?.("accepted"); await new Promise(resolve => setImmediate(resolve));
  const record = await outbox.store.inspect(event.eventId);
  assert.equal(record?.status, "pending"); assert.equal(record.lastError, "PUBLISH_REJECTED");
  await dispatcher.stop();
});

test("background failures reach the callback and shutdown prevents further claims", async () => {
  const { outbox } = await queue();
  const cause = new Error("Database unavailable"); const errors: unknown[] = [];
  let notify: (() => void) | undefined; const notified = new Promise<void>(resolve => { notify = resolve; });
  let claims = 0;
  const dispatcher = createOutboxDispatcher({ store: { ...outbox.store, async claim() { claims++; throw cause; } },
    publisher: { async publish() { return "accepted"; } }, onError(error) { errors.push(error); notify?.(); } });
  dispatcher.start(); dispatcher.start(); await notified; await dispatcher.stop();
  assert.deepEqual(errors, [cause]); assert.equal(claims, 1);
});

test("dispatcher rejects invalid timing before starting work", async () => {
  const { outbox } = await queue(); const publisher = { async publish() { return "accepted" as const; } };
  for (const value of [0, -1, 30_000, Infinity]) assert.throws(() => createOutboxDispatcher({ store: outbox.store, publisher, publishTimeoutMs: value }));
});
