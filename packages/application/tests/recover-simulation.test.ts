import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId,
  createAgent,
  createAgentProfile,
  createSimulation,
  simulationId,
  transitionSimulation,
  updateSimulationAgent,
} from "../../domain/index.ts";
import { ApplicationError } from "../errors.ts";
import { executeRecoverSimulation } from "../recover-simulation/execute.ts";
import type { SimulationRecoveryStore } from "../recover-simulation/ports.ts";

function createRunningSimulation(id = "sim-recover-1") {
  const profile = createAgentProfile({
    name: "Tester",
    personality: "Cautious",
    goals: [{ description: "Test" }],
    capabilities: ["browser"],
  });
  const aId = agentId("agent-1");
  const agent = createAgent(aId, profile);
  const created = createSimulation(
    simulationId(id),
    { kind: "web", deployment: "local" },
    [agent],
  );
  let running = transitionSimulation(created, { status: "running" });
  running = updateSimulationAgent(running, aId, { status: "running" });
  return running;
}

test("recovers interrupted running simulation to failed with default reason", async () => {
  const sim = createRunningSimulation();
  let committedSim: typeof sim | undefined;

  const store: SimulationRecoveryStore = {
    async findSimulation(id) {
      return id === sim.id ? sim : undefined;
    },
    async updateSimulationAggregate(nextSim) {
      committedSim = nextSim;
      return "updated";
    },
  };

  const result = await executeRecoverSimulation({ simulationId: sim.id }, store);

  assert.equal(result.action, "fail");
  assert.equal(result.simulation.lifecycle.status, "failed");
  if (result.simulation.lifecycle.status === "failed") {
    assert.equal(result.simulation.lifecycle.reason, "INTERRUPTED_BY_HOST_RESTART");
  }
  assert.equal(committedSim?.lifecycle.status, "failed");
  assert.equal(committedSim?.agents[0]?.lifecycle.status, "cancelled");
});

test("recovers interrupted running simulation to cancelled", async () => {
  const sim = createRunningSimulation("sim-recover-2");
  const store: SimulationRecoveryStore = {
    async findSimulation(id) {
      return id === sim.id ? sim : undefined;
    },
    async updateSimulationAggregate() {
      return "updated";
    },
  };

  const result = await executeRecoverSimulation(
    { simulationId: sim.id, action: "cancel" },
    store,
  );

  assert.equal(result.action, "cancel");
  assert.equal(result.simulation.lifecycle.status, "cancelled");
});

test("rejects recovery when simulation is not running", async () => {
  const profile = createAgentProfile({
    name: "Tester",
    personality: "Cautious",
    goals: [{ description: "Test" }],
    capabilities: ["browser"],
  });
  const aId = agentId("agent-1");
  const agent = createAgent(aId, profile);
  const created = createSimulation(
    simulationId("sim-created"),
    { kind: "web", deployment: "local" },
    [agent],
  );

  const store: SimulationRecoveryStore = {
    async findSimulation() {
      return created;
    },
    async updateSimulationAggregate() {
      return "updated";
    },
  };

  await assert.rejects(
    executeRecoverSimulation({ simulationId: created.id }, store),
    (err: unknown) =>
      err instanceof ApplicationError && err.code === "INVALID_EXECUTION_STATE",
  );
});

test("rejects recovery when simulation is not found or has concurrent conflict", async () => {
  const notFoundStore: SimulationRecoveryStore = {
    async findSimulation() {
      return undefined;
    },
    async updateSimulationAggregate() {
      return "not-found";
    },
  };

  await assert.rejects(
    executeRecoverSimulation({ simulationId: simulationId("missing") }, notFoundStore),
    (err: unknown) =>
      err instanceof ApplicationError && err.code === "SIMULATION_NOT_FOUND",
  );

  const sim = createRunningSimulation();
  const conflictStore: SimulationRecoveryStore = {
    async findSimulation() {
      return sim;
    },
    async updateSimulationAggregate() {
      return "conflict";
    },
  };

  await assert.rejects(
    executeRecoverSimulation({ simulationId: sim.id }, conflictStore),
    (err: unknown) =>
      err instanceof ApplicationError && err.code === "EXECUTION_ALREADY_ACTIVE",
  );
});
