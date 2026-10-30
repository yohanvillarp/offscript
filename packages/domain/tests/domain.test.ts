import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId, simulationId, createAgentProfile, createAgent, transitionAgent,
  createSimulation, transitionSimulation, updateSimulationAgent, DomainError,
} from "../index.ts";
import type { AgentLifecycle, SimulationLifecycle, DomainErrorCode } from "../index.ts";

const profile = () => createAgentProfile({
  name: "Curious user", personality: "Patient and observant",
  goals: [{ description: "Complete a purchase" }], capabilities: ["web.interact"],
});
const agent = (id = "a") => createAgent(agentId(id), profile());
const simulation = () => createSimulation(simulationId("s"),
  { kind: "web", deployment: "test" }, [agent("a"), agent("b")]);
const runningSimulation = () => {
  let result = transitionSimulation(simulation(), { status: "running" });
  result = updateSimulationAgent(result, agentId("a"), { status: "running" });
  return updateSimulationAgent(result, agentId("b"), { status: "running" });
};
const rejects = (fn: () => unknown, code: DomainErrorCode) =>
  assert.throws(fn, (error: unknown) => error instanceof DomainError && error.code === code);

const agentStates: readonly AgentLifecycle[] = [
  { status: "ready" }, { status: "running" }, { status: "completed" },
  { status: "failed", reason: "Target unavailable" }, { status: "cancelled" },
];
const simulationStates: readonly SimulationLifecycle[] = [
  { status: "created" }, { status: "running" }, { status: "completed" },
  { status: "failed", reason: "Run interrupted" }, { status: "cancelled" },
];

for (const from of agentStates) {
  for (const to of agentStates) {
    test(`agent transition ${from.status} -> ${to.status}`, () => {
      const input = Object.freeze({ ...agent(), lifecycle: from });
      const allowed = new Set([
        "ready:running", "ready:cancelled", "running:completed", "running:failed", "running:cancelled",
      ]).has(`${from.status}:${to.status}`);
      if (!allowed) return rejects(() => transitionAgent(input, to), "INVALID_TRANSITION");
      const result = transitionAgent(input, to);
      assert.deepEqual(result.lifecycle, to);
      assert.equal(input.lifecycle, from);
      assert.notEqual(result, input);
      assert.ok(Object.isFrozen(result.lifecycle));
    });
  }
}

for (const from of simulationStates) {
  for (const to of simulationStates) {
    test(`simulation transition ${from.status} -> ${to.status}`, () => {
      let input = simulation();
      if (from.status !== "created") {
        input = runningSimulation();
        if (from.status === "completed" || to.status === "completed") {
          input = updateSimulationAgent(input, agentId("a"), { status: "completed" });
          input = updateSimulationAgent(input, agentId("b"), { status: "completed" });
        }
        if (from.status !== "running") input = transitionSimulation(input, from);
      }
      const allowed = new Set([
        "created:running", "created:cancelled", "running:completed", "running:failed", "running:cancelled",
      ]).has(`${from.status}:${to.status}`);
      if (!allowed) return rejects(() => transitionSimulation(input, to), "INVALID_TRANSITION");
      const result = transitionSimulation(input, to);
      assert.deepEqual(result.lifecycle, to);
      assert.equal(input.lifecycle.status, from.status);
    });
  }
}

test("identities and profile values reject blank input", () => {
  rejects(() => agentId(" "), "INVALID_VALUE");
  rejects(() => simulationId("\n"), "INVALID_VALUE");
  for (const change of [
    { name: " " }, { personality: " " }, { goals: [] },
    { goals: [{ description: " " }] }, { capabilities: [" "] },
    { capabilities: ["web.interact", "web.interact"] },
  ]) rejects(() => createAgentProfile({ ...profile(), ...change }), "INVALID_VALUE");
});

test("profiles copy and freeze nested input; capabilities confer no permissions", () => {
  const goals = [{ description: "Explore" }];
  const capabilities = ["web.interact"];
  const result = createAgentProfile({ name: "A", personality: "Curious", goals, capabilities });
  goals[0]!.description = "Changed";
  capabilities.push("another.capability");
  assert.deepEqual(result.goals, [{ description: "Explore" }]);
  assert.deepEqual(result.capabilities, ["web.interact"]);
  assert.ok(Object.isFrozen(result.goals[0]));
  assert.ok(Object.isFrozen(result.capabilities));
  assert.equal("permissions" in result, false);
  assert.deepEqual(createAgentProfile({ ...result, capabilities: [] }).capabilities, []);
});

test("simulation copies agents and environment; membership cannot be mutated", () => {
  const agents = [agent()];
  const environment = { kind: "web" as const, deployment: "test" as const };
  const result = createSimulation(simulationId("s"), environment, agents);
  agents.push(agent("b"));
  assert.equal(result.agents.length, 1);
  assert.notEqual(result.environment, environment);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.environment));
  assert.ok(Object.isFrozen(result.agents));
});

test("duplicate membership and non-ready agents are rejected", () => {
  const { id, environment } = simulation();
  rejects(() => createSimulation(id, environment, [agent(), agent()]), "DUPLICATE_AGENT");
  rejects(() => createSimulation(id, environment,
    [transitionAgent(agent(), { status: "running" })]), "INVALID_TRANSITION");
});

test("an empty simulation cannot start", () => {
  const { id, environment } = simulation();
  const empty = createSimulation(id, environment, []);
  rejects(() => transitionSimulation(empty, { status: "running" }), "EMPTY_SIMULATION");
});

test("starting a simulation does not start its agents or change the original", () => {
  const original = simulation();
  const running = transitionSimulation(original, { status: "running" });
  assert.ok(running.agents.every((a) => a.lifecycle.status === "ready"));
  assert.ok(original.agents.every((a) => a.lifecycle.status === "ready"));
});

test("agent updates require a running simulation and a known member", () => {
  rejects(() => updateSimulationAgent(simulation(), agentId("a"), { status: "running" }), "INVALID_TRANSITION");
  const running = runningSimulation();
  rejects(() => updateSimulationAgent(running, agentId("missing"), { status: "completed" }), "AGENT_NOT_FOUND");
  const updated = updateSimulationAgent(running, agentId("a"), { status: "completed" });
  assert.equal(running.agents[0]!.lifecycle.status, "running");
  assert.equal(updated.agents[0]!.lifecycle.status, "completed");
  assert.equal(updated.agents[1], running.agents[1]);
});

test("simulation completion requires settled agents, not successful goals", () => {
  let running = runningSimulation();
  rejects(() => transitionSimulation(running, { status: "completed" }), "UNFINISHED_AGENTS");
  running = updateSimulationAgent(running, agentId("a"), { status: "completed" });
  rejects(() => transitionSimulation(running, { status: "completed" }), "UNFINISHED_AGENTS");
  for (const status of ["failed", "cancelled"] as const) {
    const next = status === "failed" ? { status, reason: "Failure" } : { status };
    const settled = updateSimulationAgent(running, agentId("b"), next);
    assert.equal(transitionSimulation(settled, { status: "completed" }).lifecycle.status, "completed");
  }
});

test("agents start independently after their simulation starts", () => {
  const started = transitionSimulation(simulation(), { status: "running" });
  rejects(() => transitionSimulation(started, { status: "completed" }), "UNFINISHED_AGENTS");
  const active = updateSimulationAgent(started, agentId("a"), { status: "running" });
  assert.deepEqual(active.agents.map((a) => a.lifecycle.status), ["running", "ready"]);
  const finished = updateSimulationAgent(active, agentId("a"), { status: "completed" });
  const settled = updateSimulationAgent(finished, agentId("b"), { status: "cancelled" });
  assert.equal(transitionSimulation(settled, { status: "completed" }).lifecycle.status, "completed");
});

test("cancellation and failure record cancelled participation but preserve terminal outcomes", () => {
  let running = runningSimulation();
  running = updateSimulationAgent(running, agentId("a"), { status: "failed", reason: "Target failure" });
  for (const next of [{ status: "cancelled" }, { status: "failed", reason: "Session failure" }] as const) {
    const stopped = transitionSimulation(running, next);
    assert.deepEqual(stopped.agents.map((a) => a.lifecycle.status), ["failed", "cancelled"]);
    rejects(() => updateSimulationAgent(stopped, agentId("b"), { status: "completed" }), "INVALID_TRANSITION");
  }
  const cancelled = transitionSimulation(simulation(), { status: "cancelled" });
  assert.ok(cancelled.agents.every((a) => a.lifecycle.status === "cancelled"));
});

test("failures require a nonblank reason", () => {
  rejects(() => transitionAgent(transitionAgent(agent(), { status: "running" }),
    { status: "failed", reason: " " }), "INVALID_VALUE");
  rejects(() => transitionSimulation(transitionSimulation(simulation(), { status: "running" }),
    { status: "failed", reason: " " }), "INVALID_VALUE");
});

test("stopping preserves completed agents and never changes the source snapshot", () => {
  const running = updateSimulationAgent(
    runningSimulation(), agentId("a"), { status: "completed" },
  );
  const stopped = transitionSimulation(running, { status: "cancelled" });
  assert.equal(stopped.agents[0], running.agents[0]);
  assert.equal(stopped.agents[1]!.lifecycle.status, "cancelled");
  assert.equal(running.agents[1]!.lifecycle.status, "running");
});
