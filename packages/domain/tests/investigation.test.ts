import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId, assignInvestigation, completeInvestigation, createObservation, DomainError, evidenceId,
  investigationId, observationId, requestInvestigation, simulationId,
} from "../index.ts";
import type { Investigation, InvestigationId } from "../index.ts";

const requestedAt = "2026-10-30T12:00:00.000Z";
const assignedAt = "2026-10-30T12:01:00.000Z";
const completedAt = "2026-10-30T12:03:00.000Z";
const requester = agentId("beginner");
const explorer = agentId("explorer");
const impatient = agentId("impatient");

function observation() {
  return createObservation({
    id: observationId("observation-1"), simulationId: simulationId("simulation-1"), agentId: requester,
    description: "An item vanished after reload.", observedAt: requestedAt,
    context: { location: "cart" }, evidenceIds: [],
  });
}

function request() {
  return {
    id: investigationId("investigation-1"), simulationId: simulationId("simulation-1"),
    requestedBy: requester, hypothesis: "Cart changes may not survive reload.", requestedAt,
  };
}

function requested() { return requestInvestigation(request(), [observation()]); }
function assigned() { return assignInvestigation(requested(), [explorer, impatient], assignedAt); }
function result() { return { outcome: "inconclusive" as const, explanation: "Not reproduced yet.", evidenceIds: [] }; }
function completed() { return completeInvestigation(assigned(), result(), explorer, completedAt); }

function rejects(operation: () => unknown, code: string) {
  assert.throws(operation, (error: unknown) => error instanceof DomainError && error.code === code);
}

test("request links same-simulation observations without requiring the requester to discover them", () => {
  const investigation = requestInvestigation({ ...request(), requestedBy: explorer }, [observation()]);
  assert.equal(investigation.requestedBy, explorer);
  assert.deepEqual(investigation.observationIds, [observationId("observation-1")]);
  assert.deepEqual(investigation.lifecycle, { status: "requested" });
});

test("rejects empty, duplicate, and cross-simulation observation links", () => {
  rejects(() => requestInvestigation(request(), []), "INVALID_VALUE");
  rejects(() => requestInvestigation(request(), [observation(), observation()]), "INVALID_VALUE");
  const other = { ...observation(), simulationId: simulationId("other") };
  rejects(() => requestInvestigation(request(), [other]), "INVALID_VALUE");
});

test("validates request identities, hypothesis, and canonical time", () => {
  rejects(() => investigationId(" "), "INVALID_VALUE");
  for (const patch of [
    { hypothesis: " " }, { id: " " as InvestigationId }, { requestedAt: "yesterday" },
    { requestedBy: " " as typeof requester }, { simulationId: " " as ReturnType<typeof simulationId> },
  ]) rejects(() => requestInvestigation({ ...request(), ...patch }, [observation()]), "INVALID_VALUE");
});

test("copies and freezes observation IDs without freezing caller collections", () => {
  const source = [observation()];
  const investigation = requestInvestigation(request(), source);
  source.pop();
  assert.equal(investigation.observationIds.length, 1);
  assert.ok(Object.isFrozen(investigation));
  assert.ok(Object.isFrozen(investigation.observationIds));
  assert.ok(Object.isFrozen(investigation.lifecycle));
  assert.equal(Object.isFrozen(source), false);
});

test("assigns collaborators without an exclusive leader and preserves the previous snapshot", () => {
  const source = requested();
  const agents = [explorer];
  const first = assignInvestigation(source, agents, assignedAt);
  agents.push(impatient);
  assert.deepEqual(first.lifecycle.agentIds, [explorer]);
  const second = assignInvestigation(first, [impatient], completedAt);
  assert.deepEqual(second.lifecycle.agentIds, [explorer, impatient]);
  assert.equal(second.lifecycle.assignedAt, completedAt);
  assert.equal(source.lifecycle.status, "requested");
  assert.ok(Object.isFrozen(second.lifecycle.agentIds));
});

test("rejects empty assignments, duplicate collaborators, and noncanonical or backwards assignment times", () => {
  rejects(() => assignInvestigation(requested(), [], assignedAt), "INVALID_VALUE");
  rejects(() => assignInvestigation(requested(), [explorer, explorer], assignedAt), "DUPLICATE_AGENT");
  rejects(() => assignInvestigation(assigned(), [explorer], completedAt), "DUPLICATE_AGENT");
  rejects(() => assignInvestigation(requested(), [explorer], "invalid"), "INVALID_VALUE");
  rejects(() => assignInvestigation(requested(), [explorer], "2026-10-30T11:00:00.000Z"), "INVALID_VALUE");
  rejects(() => assignInvestigation(assigned(), [requester], requestedAt), "INVALID_VALUE");
});

test("completion records one assigned author's result, without asserting consensus or confirmed defects", () => {
  const source = assigned();
  const outcome = { outcome: "supported" as const, explanation: "State disappeared in the capture.", evidenceIds: [evidenceId("capture")] };
  const investigation = completeInvestigation(source, outcome, impatient, completedAt);
  outcome.evidenceIds.push(evidenceId("later"));
  assert.equal(investigation.lifecycle.completedBy, impatient);
  assert.equal(investigation.lifecycle.result.outcome, "supported");
  assert.equal(investigation.lifecycle.result.evidenceIds.length, 1);
  assert.equal(source.lifecycle.status, "assigned");
  assert.ok(Object.isFrozen(investigation.lifecycle.result));
  assert.ok(Object.isFrozen(investigation.lifecycle.result.evidenceIds));
});

test("completion requires an assigned author and a time after the latest assignment", () => {
  rejects(() => completeInvestigation(assigned(), result(), requester, completedAt), "AGENT_NOT_FOUND");
  rejects(() => completeInvestigation(assigned(), result(), explorer, requestedAt), "INVALID_VALUE");
  rejects(() => completeInvestigation(assigned(), result(), explorer, "2026-02-30T12:00:00.000Z"), "INVALID_VALUE");
  const expanded = assignInvestigation(assigned(), [requester], completedAt);
  rejects(() => completeInvestigation(expanded, result(), explorer, assignedAt), "INVALID_VALUE");
});

const snapshots: Record<Investigation["lifecycle"]["status"], () => Investigation> = { requested, assigned, completed };
for (const status of ["requested", "assigned", "completed"] as const) {
  test(`assignment from ${status} obeys the lifecycle boundary`, () => {
    const operation = () => assignInvestigation(snapshots[status](), [agentId("new-agent")], completedAt);
    if (status === "completed") rejects(operation, "INVALID_TRANSITION");
    else assert.equal(operation().lifecycle.status, "assigned");
  });
  test(`completion from ${status} obeys the lifecycle boundary`, () => {
    const operation = () => completeInvestigation(snapshots[status](), result(), explorer, completedAt);
    if (status !== "assigned") rejects(operation, "INVALID_TRANSITION");
    else assert.equal(operation().lifecycle.status, "completed");
  });
}
