import assert from "node:assert/strict";
import { test } from "node:test";
import { agentId, assignInvestigation, completeInvestigation, DomainError, investigationId, simulationId, transitionSimulation, updateSimulationAgent } from "../../domain/index.ts";
import { ContractValidationError, deserializeSemanticEvent, serializeSemanticEvent } from "../../contracts/index.ts";
import { ApplicationError, executeAssignInvestigation } from "../index.ts";
import type { ApplicationErrorCode } from "../index.ts";
import { assignmentCommand, assignmentContext } from "./assignment-context.ts";
import { readySimulation, runningSimulation } from "./memory-context.ts";

function code(expected: ApplicationErrorCode) {
  return (error: unknown) => error instanceof ApplicationError && error.code === expected;
}

test("saves initial assignment before publishing its validated event and storage revision", async () => {
  const context = assignmentContext();
  const result = await executeAssignInvestigation(assignmentCommand(), context.dependencies);
  assert.equal(result.revision, 1);
  assert.deepEqual(result.investigation.lifecycle.agentIds, [agentId("explorer")]);
  assert.equal(result.event.type, "investigation.assigned");
  assert.equal(result.event.correlationId, assignmentCommand().correlationId);
  assert.deepEqual(deserializeSemanticEvent(serializeSemanticEvent(result.event)), result.event);
  assert.equal(result.publication.status, "published");
  assert.deepEqual(context.calls, ["read-investigation", "read-simulation", "save", "publish"]);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.investigation.lifecycle.agentIds));
  assert.equal(context.requested.lifecycle.status, "requested");
});

test("additional collaborators preserve existing assignments and increment only the storage revision", async () => {
  const context = assignmentContext();
  await executeAssignInvestigation(assignmentCommand(), context.dependencies);
  const result = await executeAssignInvestigation({
    ...assignmentCommand(), agentIds: [agentId("beginner")], origin: { kind: "agent", agentId: agentId("beginner") }, eventId: "assignment-2",
  }, context.dependencies);
  assert.equal(result.revision, 2);
  assert.deepEqual(result.investigation.lifecycle.agentIds, [agentId("explorer"), agentId("beginner")]);
  assert.equal("revision" in result.investigation, false);
  assert.equal(context.events.length, 2);
});

test("an active assigning agent need not be one of the new collaborators", async () => {
  const context = assignmentContext();
  const result = await executeAssignInvestigation({ ...assignmentCommand(), origin: { kind: "agent", agentId: agentId("beginner") } }, context.dependencies);
  assert.equal(result.event.origin.kind, "agent");
  assert.deepEqual(result.investigation.lifecycle.agentIds, [agentId("explorer")]);
});

test("rejects missing investigations and foreign/mismatched investigation references", async () => {
  const context = assignmentContext();
  await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), investigationId: investigationId("missing") }, context.dependencies), code("INVESTIGATION_NOT_FOUND"));
  await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), simulationId: simulationId("other") }, context.dependencies), code("INVALID_REFERENCE"));
  context.records.set(context.requested.id, { investigation: { ...context.requested, id: investigationId("wrong") }, revision: 0 });
  await assert.rejects(executeAssignInvestigation(assignmentCommand(), context.dependencies), code("INVALID_REFERENCE"));
  assert.equal(context.events.length, 0);
});

for (const revision of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER]) {
  test(`rejects invalid or exhausted storage revision ${revision}`, async () => {
    const context = assignmentContext();
    context.records.set(context.requested.id, { investigation: context.requested, revision });
    await assert.rejects(executeAssignInvestigation(assignmentCommand(), context.dependencies), code("INVALID_REFERENCE"));
    assert.equal(context.calls.includes("save"), false);
  });
}

test("requires a matching running simulation", async () => {
  for (const simulation of [undefined, readySimulation(), transitionSimulation(runningSimulation(), { status: "cancelled" }),
    { ...runningSimulation(), id: simulationId("wrong") }]) {
    const context = assignmentContext();
    const dependencies = { ...context.dependencies, simulations: { async findSimulation() { return simulation; } } };
    await assert.rejects(executeAssignInvestigation(assignmentCommand(), dependencies), code(!simulation ? "SIMULATION_NOT_FOUND"
      : simulation.id !== assignmentCommand().simulationId ? "INVALID_REFERENCE" : "SIMULATION_NOT_RUNNING"));
    assert.equal(context.calls.includes("save"), false);
  }
});

test("rejects unknown assignees without treating another simulation's agents as members", async () => {
  const context = assignmentContext();
  await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), agentIds: [agentId("outsider")] }, context.dependencies), code("ASSIGNEE_NOT_FOUND"));
  assert.equal(context.events.length, 0);
});

for (const status of ["ready", "completed", "failed", "cancelled"] as const) {
  test(`rejects assignee participation ${status}`, async () => {
    const context = assignmentContext();
    const simulation = status === "ready" ? runningSimulation() : updateSimulationAgent(
      updateSimulationAgent(runningSimulation(), agentId("beginner"), { status: "running" }), agentId("beginner"),
      status === "failed" ? { status, reason: "Stopped" } : { status },
    );
    context.simulations.set(simulation.id, simulation);
    await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), agentIds: [agentId("beginner")] }, context.dependencies), code("ASSIGNEE_NOT_RUNNING"));
    assert.equal(context.events.length, 0);
  });
}

test("agent origins must be active members, while system origins are trusted composition metadata", async () => {
  const context = assignmentContext();
  await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), origin: { kind: "agent", agentId: agentId("outsider") } }, context.dependencies), code("ASSIGNER_NOT_FOUND"));
  context.simulations.set(runningSimulation().id, runningSimulation());
  await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), origin: { kind: "agent", agentId: agentId("beginner") } }, context.dependencies), code("ASSIGNER_NOT_RUNNING"));
  assert.equal(context.events.length, 0);
});

test("domain rejects duplicate/empty assignees, backwards time, and completed investigations before saving", async () => {
  for (const patch of [{ agentIds: [] }, { agentIds: [agentId("explorer"), agentId("explorer")] }, { assignedAt: "invalid" }, { assignedAt: "2026-10-30T11:00:00.000Z" }]) {
    const context = assignmentContext();
    await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), ...patch }, context.dependencies), DomainError);
    assert.equal(context.events.length, 0);
  }
  const context = assignmentContext();
  const assigned = assignInvestigation(context.requested, [agentId("explorer")], assignmentCommand().assignedAt);
  context.records.set(assigned.id, { investigation: assigned, revision: 1 });
  await assert.rejects(executeAssignInvestigation(assignmentCommand(), context.dependencies), DomainError);
  const completed = completeInvestigation(assigned, { outcome: "inconclusive", explanation: "No conclusion", evidenceIds: [] }, agentId("explorer"), assignmentCommand().assignedAt);
  context.records.set(completed.id, { investigation: completed, revision: 2 });
  await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), agentIds: [agentId("beginner")] }, context.dependencies), DomainError);
  assert.equal(context.calls.includes("save"), false);
});

test("invalid event metadata cannot save an otherwise valid assignment", async () => {
  for (const patch of [{ eventId: " " }, { correlationId: " " }]) {
    const context = assignmentContext();
    await assert.rejects(executeAssignInvestigation({ ...assignmentCommand(), ...patch }, context.dependencies), ContractValidationError);
    assert.equal(context.calls.includes("save"), false);
  }
});
