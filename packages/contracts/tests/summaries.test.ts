import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSimulation, transitionSimulation, transitionAgent, updateSimulationAgent,
} from "../../domain/index.ts";
import {
  ContractValidationError, parseAgentSummary, parseSimulationSummary, toAgentSummary, toSimulationSummary,
} from "../index.ts";
import { agentIdentity, agentSummary, domainAgent, simulationIdentity, simulationSummary } from "./fixtures.ts";

for (const status of ["ready", "running", "completed", "failed", "cancelled"] as const) {
  test(`agent summary preserves domain ${status} lifecycle through JSON`, () => {
    const summary = agentSummary(status);
    assert.deepEqual(parseAgentSummary(JSON.parse(JSON.stringify(summary))), summary);
    assert.equal(summary.lifecycle.status, status);
  });
}

for (const status of ["created", "running", "completed", "failed", "cancelled"] as const) {
  test(`simulation summary preserves domain ${status} lifecycle through JSON`, () => {
    const summary = simulationSummary(status);
    assert.deepEqual(parseSimulationSummary(JSON.parse(JSON.stringify(summary))), summary);
    assert.equal(summary.lifecycle.status, status);
  });
}

test("mapping creates detached immutable summaries without internal profiles", () => {
  const agent = transitionAgent(transitionAgent(domainAgent(), { status: "running" }),
    { status: "failed", reason: "Unavailable" });
  const summary = toAgentSummary(simulationIdentity, agent);
  assert.notEqual(summary.lifecycle, agent.lifecycle);
  assert.ok(Object.isFrozen(summary));
  assert.ok(Object.isFrozen(summary.lifecycle));
  assert.equal("profile" in summary, false);
  const simulation = createSimulation(simulationIdentity, { kind: "web", deployment: "test" }, [domainAgent()]);
  const simulationDTO = toSimulationSummary(simulation);
  assert.notEqual(simulationDTO.environment, simulation.environment);
  assert.notEqual(simulationDTO.lifecycle, simulation.lifecycle);
  assert.ok(Object.isFrozen(simulationDTO.agentIds));
  assert.equal("agents" in simulationDTO, false);
});

test("summaries do not mistake settled participation for goal success", () => {
  let simulation = transitionSimulation(
    createSimulation(simulationIdentity, { kind: "web", deployment: "test" }, [domainAgent()]),
    { status: "running" },
  );
  simulation = updateSimulationAgent(simulation, agentIdentity, { status: "cancelled" });
  simulation = transitionSimulation(simulation, { status: "completed" });
  assert.equal(toSimulationSummary(simulation).lifecycle.status, "completed");
  assert.equal(toAgentSummary(simulationIdentity, simulation.agents[0]!).lifecycle.status, "cancelled");
});

for (const lifecycle of [
  {}, { status: "idle" }, { status: "failed" }, { status: "failed", reason: " " },
  { status: "running", reason: "extra" }, { status: "running", reason: undefined },
  { status: "completed", achievedGoals: true },
]) {
  test(`rejects invalid agent and simulation lifecycles: ${JSON.stringify(lifecycle)}`, () => {
    assert.throws(() => parseAgentSummary({ ...agentSummary(), lifecycle }), ContractValidationError);
    assert.throws(() => parseSimulationSummary({ ...simulationSummary(), lifecycle }), ContractValidationError);
  });
}

for (const field of ["id", "simulationId", "name"] as const) {
  test(`agent summary rejects blank or missing ${field}`, () => {
    assert.throws(() => parseAgentSummary({ ...agentSummary(), [field]: " " }), ContractValidationError);
    const input: Record<string, unknown> = { ...agentSummary() };
    delete input[field];
    assert.throws(() => parseAgentSummary(input), ContractValidationError);
  });
}

const sparseRoster: string[] = [];
sparseRoster.length = 1;
for (const agentIds of [null, "not-an-array", [" "], [agentIdentity, agentIdentity], sparseRoster, [undefined]]) {
  test(`rejects invalid agent roster: ${JSON.stringify(agentIds)}`, () => {
    assert.throws(() => parseSimulationSummary({ ...simulationSummary(), agentIds }), ContractValidationError);
  });
}

for (const environment of [null, {}, { kind: "desktop", deployment: "test" },
  { kind: "web", deployment: "unknown" }, { kind: "web", deployment: "test", credentials: "private" }]) {
  test(`rejects invalid environment: ${JSON.stringify(environment)}`, () => {
    assert.throws(() => parseSimulationSummary({ ...simulationSummary(), environment }), ContractValidationError);
  });
}

test("simulation summary rejects missing fields and blank identity", () => {
  for (const field of ["id", "environment", "lifecycle", "agentIds"] as const) {
    const input: Record<string, unknown> = { ...simulationSummary() };
    delete input[field];
    assert.throws(() => parseSimulationSummary(input), ContractValidationError);
  }
  assert.throws(() => parseSimulationSummary({ ...simulationSummary(), id: " " }), ContractValidationError);
});

test("parsers clone roster arrays rather than freezing caller-owned data", () => {
  const agentIds = [agentIdentity];
  const summary = parseSimulationSummary({ ...simulationSummary(), agentIds });
  agentIds.length = 0;
  assert.deepEqual(summary.agentIds, [agentIdentity]);
  assert.ok(Object.isFrozen(summary.environment));
});
