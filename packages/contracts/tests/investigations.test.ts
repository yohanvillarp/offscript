import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContractValidationError, createSemanticEvent, deserializeSemanticEvent, parseInvestigationEvent,
  parseInvestigationResult, parseInvestigationSummary, parseLifecycleEvent, parseSemanticEvent, serializeSemanticEvent,
} from "../index.ts";
import { investigationEvent, investigationTypes } from "./investigation-fixtures.ts";

for (const type of investigationTypes) {
  test(`${type} round-trips through semantic entry points with provenance and correlation intact`, () => {
    const source = investigationEvent(type);
    assert.deepEqual(deserializeSemanticEvent(serializeSemanticEvent(createSemanticEvent(source))), source);
    assert.deepEqual(parseInvestigationEvent(source), source);
    assert.equal(parseSemanticEvent(source).correlationId, "correlation-1");
    assert.throws(() => parseLifecycleEvent(source), ContractValidationError);
  });

  for (const patch of [{ schemaVersion: 2 }, { eventId: " " }, { occurredAt: "invalid" },
    { correlationId: "" }, { simulationId: "other" }, { type: "investigation.unknown" }, { payload: {} },
    { payload: { investigation: investigationEvent(type).payload.investigation, extra: true } }]) {
    test(`${type} rejects invalid metadata or envelope payload ${JSON.stringify(patch)}`, () => {
      assert.throws(() => parseSemanticEvent({ ...investigationEvent(type), ...patch }), ContractValidationError);
    });
  }
}

const requested = investigationEvent().payload.investigation;
const assigned = investigationEvent("investigation.assigned").payload.investigation;
const completed = investigationEvent("investigation.completed").payload.investigation;

const invalidSummaries: readonly unknown[] = [
  null, {}, { ...requested, id: " " }, { ...requested, requestedBy: "" },
  { ...requested, simulationId: null }, { ...requested, hypothesis: " " },
  { ...requested, requestedAt: "2026-02-30T12:00:00.000Z" },
  { ...requested, observationIds: [] }, { ...requested, observationIds: ["one", "one"] },
  { ...requested, observationIds: Array(1) }, { ...requested, observationIds: [" "] },
  { ...requested, observationIds: null }, { ...requested, confirmed: true },
  { ...requested, lifecycle: { status: "requested", agentIds: [] } },
  { ...requested, lifecycle: { status: "running" } }, { ...requested, lifecycle: null },
  { ...assigned, lifecycle: { ...assigned.lifecycle, agentIds: [] } },
  { ...assigned, lifecycle: { ...assigned.lifecycle, agentIds: ["one", "one"] } },
  { ...assigned, lifecycle: { ...assigned.lifecycle, agentIds: [" "] } },
  { ...assigned, lifecycle: { ...assigned.lifecycle, completedAt: "2026-10-30T12:00:00.000Z" } },
  { ...assigned, lifecycle: { ...assigned.lifecycle, assignedAt: "2026-10-30T11:00:00.000Z" } },
  { ...completed, lifecycle: { ...completed.lifecycle, completedBy: "not-assigned" } },
  { ...completed, lifecycle: { ...completed.lifecycle, completedAt: "2026-10-30T11:00:00.000Z" } },
  { ...completed, lifecycle: { ...completed.lifecycle, completedAt: "yesterday" } },
  { ...completed, lifecycle: { ...completed.lifecycle, result: { outcome: "confirmed" } } },
  { ...completed, lifecycle: { ...completed.lifecycle, result: { outcome: "supported", explanation: "Assertion", evidenceIds: [] } } },
];

for (const [index, value] of invalidSummaries.entries()) {
  test(`rejects invalid investigation snapshot ${index}`, () => {
    assert.throws(() => parseInvestigationSummary(value), ContractValidationError);
  });
}

for (const field of Object.keys(requested)) {
  test(`requires investigation field ${field}`, () => {
    const source: Record<string, unknown> = { ...requested };
    delete source[field];
    assert.throws(() => parseInvestigationSummary(source), ContractValidationError);
  });
}

test("rejects event and snapshot lifecycle mismatches", () => {
  for (const type of investigationTypes) {
    for (const other of investigationTypes.filter((candidate) => candidate !== type)) {
      assert.throws(() => parseSemanticEvent({ ...investigationEvent(type), payload: investigationEvent(other).payload }), ContractValidationError);
    }
  }
});

test("request and completion agent origins must match the recorded author", () => {
  for (const type of ["investigation.requested", "investigation.completed"] as const) {
    assert.throws(() => parseSemanticEvent({
      ...investigationEvent(type), origin: { kind: "agent", agentId: "other" },
    }), ContractValidationError);
    assert.equal(parseSemanticEvent({
      ...investigationEvent(type), origin: { kind: "agent", agentId: "beginner" },
    }).type, type);
  }
});

test("assignment origin need not be an assignee and does not grant authority", () => {
  assert.equal(parseSemanticEvent({
    ...investigationEvent("investigation.assigned"), origin: { kind: "agent", agentId: "requester" },
  }).type, "investigation.assigned");
});

test("parsing detaches and freezes a completed snapshot including result and collaborator lists", () => {
  const source = JSON.parse(JSON.stringify(completed));
  const parsed = parseInvestigationSummary(source);
  source.observationIds.push("later");
  source.lifecycle.agentIds.push("new-agent");
  source.lifecycle.result.evidenceIds.push("new-evidence");
  assert.equal(parsed.observationIds.length, 1);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.observationIds));
  assert.ok(Object.isFrozen(parsed.lifecycle));
  if (parsed.lifecycle.status !== "completed") assert.fail("Expected completed snapshot");
  assert.equal(parsed.lifecycle.agentIds.length, 2);
  assert.equal(parsed.lifecycle.result.evidenceIds.length, 1);
  assert.ok(Object.isFrozen(parsed.lifecycle.agentIds));
  assert.ok(Object.isFrozen(parsed.lifecycle.result));
  assert.ok(Object.isFrozen(parsed.lifecycle.result.evidenceIds));
  assert.equal(Object.isFrozen(source), false);
});

test("result validation preserves literal explanations and rejects unsupported result fields", () => {
  const result = { outcome: "inconclusive", explanation: "  Unable to reproduce.\nNeed more observations.  ", evidenceIds: [] };
  assert.equal(parseInvestigationResult(result).explanation, result.explanation);
  for (const patch of [
    { explanation: " " }, { outcome: "confirmed" }, { confirmed: true },
    { evidenceIds: ["same", "same"] }, { evidenceIds: [null] }, { evidenceIds: undefined },
  ]) assert.throws(() => parseInvestigationResult({ ...result, ...patch }), ContractValidationError);
});
