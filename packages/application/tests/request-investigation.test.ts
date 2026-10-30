import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId, DomainError, observationId, simulationId, transitionSimulation, updateSimulationAgent,
} from "../../domain/index.ts";
import { ContractValidationError, deserializeSemanticEvent, serializeSemanticEvent } from "../../contracts/index.ts";
import { ApplicationError, executeRequestInvestigation } from "../index.ts";
import type { ApplicationErrorCode } from "../index.ts";
import { command, memoryContext, observation, readySimulation, runningSimulation } from "./memory-context.ts";

function code(expected: ApplicationErrorCode) {
  return (error: unknown) => error instanceof ApplicationError && error.code === expected;
}

test("resolves context, saves a request, then publishes its validated semantic event", async () => {
  const context = memoryContext();
  const result = await executeRequestInvestigation(command(), context.dependencies);
  assert.equal(result.investigation.requestedBy, agentId("explorer"));
  assert.deepEqual(result.investigation.observationIds, [observationId("observation-1")]);
  assert.equal(result.investigation.lifecycle.status, "requested");
  assert.equal(result.publication.status, "published");
  assert.equal(context.investigations.get(command().investigationId), result.investigation);
  assert.equal(context.events.length, 1);
  assert.deepEqual(context.calls, ["read-simulation", "read-observation", "save", "publish"]);
  assert.equal(result.event.correlationId, command().correlationId);
  assert.deepEqual(deserializeSemanticEvent(serializeSemanticEvent(result.event)), result.event);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.investigation.observationIds));
  assert.ok(Object.isFrozen(result.event));
});

test("missing simulation causes no reads of observations, writes, or publication", async () => {
  const context = memoryContext();
  context.simulations.clear();
  await assert.rejects(executeRequestInvestigation(command(), context.dependencies), code("SIMULATION_NOT_FOUND"));
  assert.deepEqual(context.calls, ["read-simulation"]);
});

for (const status of ["created", "completed", "failed", "cancelled"] as const) {
  test(`rejects simulation lifecycle ${status}`, async () => {
    const context = memoryContext();
    const running = runningSimulation();
    const simulation = status === "created" ? readySimulation()
      : status === "completed"
        ? transitionSimulation(updateSimulationAgent(updateSimulationAgent(running,
          agentId("explorer"), { status: "cancelled" }), agentId("beginner"), { status: "cancelled" }), { status: "completed" })
        : transitionSimulation(running, status === "failed" ? { status, reason: "Stopped" } : { status });
    context.simulations.set(command().simulationId, simulation);
    await assert.rejects(executeRequestInvestigation(command(), context.dependencies), code("SIMULATION_NOT_RUNNING"));
    assert.equal(context.investigations.size, 0);
    assert.equal(context.events.length, 0);
  });
}

test("requester must belong to the running simulation", async () => {
  const context = memoryContext();
  await assert.rejects(executeRequestInvestigation({ ...command(), requestedBy: agentId("other") }, context.dependencies), code("REQUESTER_NOT_FOUND"));
  assert.equal(context.investigations.size, 0);
});

for (const status of ["ready", "completed", "failed", "cancelled"] as const) {
  test(`rejects requester participation ${status}`, async () => {
    const context = memoryContext();
    const next = status === "ready" ? transitionSimulation(readySimulation(), { status: "running" })
      : updateSimulationAgent(runningSimulation(), agentId("explorer"), status === "failed" ? { status, reason: "Stopped" } : { status });
    context.simulations.set(command().simulationId, next);
    await assert.rejects(executeRequestInvestigation(command(), context.dependencies), code("REQUESTER_NOT_RUNNING"));
    assert.equal(context.events.length, 0);
  });
}

test("rejects absent observations and observations from another simulation or unknown author", async () => {
  for (const value of [undefined, { ...observation(), simulationId: simulationId("other") }, { ...observation(), agentId: agentId("outsider") }]) {
    const context = memoryContext();
    context.observations.clear();
    if (value) context.observations.set(observationId("observation-1"), value);
    await assert.rejects(executeRequestInvestigation(command(), context.dependencies), code(value ? "INVALID_REFERENCE" : "OBSERVATION_NOT_FOUND"));
    assert.equal(context.investigations.size, 0);
    assert.equal(context.events.length, 0);
  }
});

test("rejects adapter lookups returning an unexpected identity", async () => {
  for (const scope of ["simulation", "observation"] as const) {
    const context = memoryContext();
    const dependencies = scope === "simulation" ? {
      ...context.dependencies, simulations: { async findSimulation() { return { ...runningSimulation(), id: simulationId("wrong") }; } },
    } : {
      ...context.dependencies, observations: { async findObservation() { return { ...observation(), id: observationId("wrong") }; } },
    };
    await assert.rejects(executeRequestInvestigation(command(), dependencies), code("INVALID_REFERENCE"));
    assert.equal(context.events.length, 0);
  }
});

test("domain validation rejects empty/duplicate observation lists and blank hypotheses before writes", async () => {
  for (const patch of [{ observationIds: [] }, { observationIds: [observationId("observation-1"), observationId("observation-1")] }, { hypothesis: " " }]) {
    const context = memoryContext();
    await assert.rejects(executeRequestInvestigation({ ...command(), ...patch }, context.dependencies), DomainError);
    assert.equal(context.investigations.size, 0);
    assert.equal(context.events.length, 0);
  }
});

test("invalid event metadata prevents saving a domain request", async () => {
  for (const patch of [{ eventId: " " }, { correlationId: " " }]) {
    const context = memoryContext();
    await assert.rejects(executeRequestInvestigation({ ...command(), ...patch }, context.dependencies), ContractValidationError);
    assert.equal(context.investigations.size, 0);
  }
});
