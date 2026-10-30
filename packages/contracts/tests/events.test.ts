import assert from "node:assert/strict";
import { test } from "node:test";
import { agentId } from "../../domain/index.ts";
import {
  ContractValidationError, createLifecycleEvent, parseLifecycleEvent,
  serializeLifecycleEvent, deserializeLifecycleEvent,
} from "../index.ts";
import { agentIdentity, agentSummary, eventInput, eventTypes, simulationIdentity, simulationSummary, time } from "./fixtures.ts";

for (const type of eventTypes) {
  test(`${type} accepts a valid payload and round-trips through JSON`, () => {
    const input = eventInput(type);
    const event = parseLifecycleEvent(input);
    assert.deepEqual(event, input);
    assert.deepEqual(deserializeLifecycleEvent(serializeLifecycleEvent(event)), event);
    assert.equal(event.correlationId, "correlation-1");
    assert.equal(event.simulationId, simulationIdentity);
    assert.equal(event.origin.kind, "system");
    assert.ok(Object.isFrozen(event));
    assert.ok(Object.isFrozen(event.payload));
  });

  test(`${type} rejects missing payload fields and mismatched lifecycle`, () => {
    const input = eventInput(type);
    assert.throws(() => parseLifecycleEvent({ ...input, payload: {} }), ContractValidationError);
    const payload = type.startsWith("agent.")
      ? { agent: { ...agentSummary(), lifecycle: { status: "ready" } } }
      : { simulation: { ...simulationSummary(), lifecycle: { status: "created" } } };
    assert.throws(() => parseLifecycleEvent({ ...input, payload }), ContractValidationError);
  });

  test(`${type} rejects an affected subject from another simulation`, () => {
    const input = eventInput(type);
    assert.throws(() => parseLifecycleEvent({ ...input, simulationId: "another-simulation" }), ContractValidationError);
  });
}

test("typed creation accepts caller-provided metadata without generating values", () => {
  const event = createLifecycleEvent({
    eventId: "supplied-id", schemaVersion: 1, type: "agent.failed", occurredAt: time,
    simulationId: simulationIdentity, correlationId: "supplied-correlation", origin: { kind: "system" },
    payload: { agent: {
      id: agentIdentity, simulationId: simulationIdentity, name: "Visitor",
      lifecycle: { status: "failed", reason: "Target unavailable" },
    } },
  });
  assert.equal(event.eventId, "supplied-id");
  assert.equal(event.occurredAt, time);
  assert.equal(event.correlationId, "supplied-correlation");
  assert.deepEqual(createLifecycleEvent(event), event);
});

test("originating agent and affected agent are distinct", () => {
  const originId = agentId("collaborator");
  const event = parseLifecycleEvent({ ...eventInput(), origin: { kind: "agent", agentId: originId } });
  assert.deepEqual(event.origin, { kind: "agent", agentId: originId });
  assert.ok(Object.isFrozen(event.origin));
  assert.equal(event.type, "agent.started");
  if (event.type === "agent.started") assert.equal(event.payload.agent.id, agentIdentity);
});

for (const key of ["eventId", "occurredAt", "simulationId", "origin", "correlationId", "type", "schemaVersion", "payload"] as const) {
  test(`rejects missing ${key}`, () => {
    const input: Record<string, unknown> = { ...eventInput() };
    delete input[key];
    assert.throws(() => parseLifecycleEvent(input), ContractValidationError);
  });
}

for (const [field, values] of [
  ["eventId", ["", " ", null, 42, false, {}, [], 1n]],
  ["simulationId", ["", " ", null, 42]],
  ["correlationId", ["", " ", null, 42]],
  ["schemaVersion", [0, 2, "1", null, 1.5]],
  ["type", ["agent.created", "observation.created", "unknown", "", 3]],
  ["origin", [null, {}, { kind: "human" }, { kind: "agent" }, { kind: "agent", agentId: " " },
    { kind: "system", agentId: agentIdentity }, { kind: "agent", agentId: agentIdentity, permissions: [] }]],
  ["occurredAt", ["", "yesterday", "2026-02-30T12:00:00.000Z", "2026-13-01T12:00:00.000Z",
    "2026-10-30", "2026-10-30T12:00:00Z", "2026-10-30T13:00:00.000+01:00", new Date(time), 0]],
] as const) {
  for (const value of values) {
    test(`rejects invalid ${field}: ${String(value)}`, () => {
      assert.throws(() => parseLifecycleEvent({ ...eventInput(), [field]: value }), ContractValidationError);
    });
  }
}

test("unknown properties are rejected instead of leaking into a serialized contract", () => {
  assert.throws(() => parseLifecycleEvent({ ...eventInput(), secret: "private" }), ContractValidationError);
  assert.throws(() => parseLifecycleEvent({ ...eventInput(), [Symbol("extra")]: true }), ContractValidationError);
  assert.throws(() => parseLifecycleEvent({ ...eventInput(), payload: { agent: agentSummary(), confirmed: true } }), ContractValidationError);
});

for (const value of [null, undefined, [], "{}", 1, new Date(), Object.create({ eventId: "inherited" })] as const) {
  test(`rejects non-object or non-plain event input: ${String(value)}`, () => {
    assert.throws(() => parseLifecycleEvent(value), ContractValidationError);
  });
}

for (const json of ["{", "", "undefined", "null", "[]", "42"]) {
  test(`rejects malformed JSON or invalid JSON root: ${json}`, () => {
    assert.throws(() => deserializeLifecycleEvent(json), ContractValidationError);
  });
}

test("parsing detaches nested data and preserves correlation between related events", () => {
  const mutable = JSON.parse(JSON.stringify(eventInput())) as { origin: { kind: string }; payload: { agent: { name: string } } };
  const event = parseLifecycleEvent(mutable);
  mutable.origin.kind = "agent";
  mutable.payload.agent.name = "Changed";
  if (event.type === "agent.started") assert.equal(event.payload.agent.name, "Curious visitor");
  assert.equal(event.origin.kind, "system");
  const related = parseLifecycleEvent({ ...eventInput("agent.completed"), eventId: "next-event" });
  assert.equal(related.correlationId, event.correlationId);
  assert.notEqual(related.eventId, event.eventId);
});

test("validation errors expose the failing path", () => {
  assert.throws(() => parseLifecycleEvent({ ...eventInput(), correlationId: " " }),
    (error: unknown) => error instanceof ContractValidationError && error.path === "event.correlationId");
});
