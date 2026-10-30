import assert from "node:assert/strict";
import { test } from "node:test";
import { createMozaikOutboxPublisher } from "../index.ts";
import { executeRequestInvestigation } from "../../application/index.ts";
import { command, memoryContext } from "../../application/tests/memory-context.ts";

test("publisher defers missing or inactive sessions without creating participants", async () => {
  const event = (await executeRequestInvestigation(command(), memoryContext().dependencies)).event;
  let resolved = 0; let dispatched = 0;
  const missing = createMozaikOutboxPublisher(id => { assert.equal(id, event.simulationId); resolved++; return undefined; });
  assert.equal(await missing.publish(event), "deferred");
  const inactive = createMozaikOutboxPublisher(() => ({ canAcceptEvent: () => false, publishEvent() { dispatched++; } }));
  assert.equal(await inactive.publish(event), "deferred");
  assert.equal(resolved, 1); assert.equal(dispatched, 0);
});

test("acceptance reports dispatch only and preserves the exact event", async () => {
  const event = (await executeRequestInvestigation(command(), memoryContext().dependencies)).event;
  const publisher = createMozaikOutboxPublisher(() => ({ canAcceptEvent: () => true,
    publishEvent(value) { assert.equal(value, event); } }));
  assert.equal(await publisher.publish(event), "accepted");
  const failed = createMozaikOutboxPublisher(() => ({ canAcceptEvent: () => true,
    publishEvent() { throw new Error("Dispatch rejected"); } }));
  await assert.rejects(failed.publish(event), /Dispatch rejected/);
});
