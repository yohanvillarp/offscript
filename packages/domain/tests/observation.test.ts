import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId, createObservation, DomainError, evidenceId, observationId, simulationId,
} from "../index.ts";
import type { Observation } from "../index.ts";

function input(): Observation {
  return {
    id: observationId("observation-1"), simulationId: simulationId("simulation-1"),
    agentId: agentId("beginner-1"), observedAt: "2026-10-30T12:00:00.000Z",
    description: "The saved item disappeared after reload.",
    context: { location: "checkout/cart" }, evidenceIds: [evidenceId("capture-1")],
  };
}

function invalid(operation: () => unknown) {
  assert.throws(operation, (error: unknown) => error instanceof DomainError && error.code === "INVALID_VALUE");
}

test("observations preserve provenance without implying a finding or requiring specialization", () => {
  const observation = createObservation(input());
  assert.equal(observation.agentId, agentId("beginner-1"));
  assert.equal(observation.description, input().description);
  assert.equal("severity" in observation, false);
  assert.equal("confirmed" in observation, false);
});

test("an observation can exist before evidence resources have been collected", () => {
  assert.deepEqual(createObservation({ ...input(), evidenceIds: [] }).evidenceIds, []);
});

test("observations copy and recursively freeze context and evidence references", () => {
  const context = { location: "cart" };
  const evidenceIds = [evidenceId("capture-1")];
  const source = { ...input(), context, evidenceIds };
  const result = createObservation(source);
  context.location = "changed";
  evidenceIds.push(evidenceId("capture-2"));
  assert.equal(result.context.location, "cart");
  assert.deepEqual(result.evidenceIds, [evidenceId("capture-1")]);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.context));
  assert.ok(Object.isFrozen(result.evidenceIds));
  assert.equal(Object.isFrozen(source), false);
  assert.equal(Object.isFrozen(context), false);
});

for (const value of ["", " ", "\n\t"]) {
  test(`rejects blank observation and evidence identities: ${JSON.stringify(value)}`, () => {
    invalid(() => observationId(value));
    invalid(() => evidenceId(value));
  });
  test(`rejects blank observation description and location: ${JSON.stringify(value)}`, () => {
    invalid(() => createObservation({ ...input(), description: value }));
    invalid(() => createObservation({ ...input(), context: { location: value } }));
  });
}

for (const observedAt of ["", "invalid", "2026-02-30T12:00:00.000Z", "2026-10-30", "2026-10-30T12:00:00Z",
  "2026-10-30T12:00:00.000+00:00"]) {
  test(`rejects a noncanonical or impossible observation time: ${observedAt}`, () => {
    invalid(() => createObservation({ ...input(), observedAt }));
  });
}

test("rejects duplicate evidence references", () => {
  invalid(() => createObservation({ ...input(), evidenceIds: [evidenceId("one"), evidenceId("one")] }));
});

test("preserves literal descriptions, opaque locations, and non-UUID identities", () => {
  const result = createObservation({ ...input(), description: "  First line\nSecond line  ", context: { location: "screen:settings" } });
  assert.equal(result.description, "  First line\nSecond line  ");
  assert.equal(result.context.location, "screen:settings");
});

test("factory revalidates branded identities rather than relying only on their types", () => {
  invalid(() => createObservation({ ...input(), id: " " as Observation["id"] }));
  invalid(() => createObservation({ ...input(), simulationId: " " as Observation["simulationId"] }));
  invalid(() => createObservation({ ...input(), agentId: " " as Observation["agentId"] }));
  invalid(() => createObservation({ ...input(), evidenceIds: [" " as Observation["evidenceIds"][number]] }));
});
