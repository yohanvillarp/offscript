import assert from "node:assert/strict";
import { test } from "node:test";
import { agentId, simulationId } from "../../domain/index.ts";
import { createExplorationSession } from "../index.ts";
import { deterministicRunner } from "../../../scripts/mozaik/deterministic-runner.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";

test("two Mozaik agents explore concurrently and react to an investigation through their real handlers", async (t) => {
  const fixture = scenario();
  const fixtureRunner = deterministicRunner();
  let inFlight = 0;
  let maximumConcurrent = 0;
  const session = createExplorationSession({
    simulation: fixture.simulation, model: "fixture", allowedTools: fixture.permissions,
    runner: { ...fixtureRunner, async run(input) {
      inFlight++;
      maximumConcurrent = Math.max(maximumConcurrent, inFlight);
      try { return await fixtureRunner.run(input); } finally { inFlight--; }
    } },
  });
  t.after(() => session.close());
  assert.equal(session.startTurn(fixture.beginner, "Explore the cart"), true);
  assert.equal(session.startTurn(fixture.explorer, "Explore independently"), true);
  assert.equal(session.startTurn(fixture.beginner, "Overlapping turn"), false);
  const result = await session.waitForIdle();
  assert.equal(result.investigations.length, 1);
  const investigation = result.investigations[0];
  assert.equal(investigation?.lifecycle.status, "assigned");
  if (investigation?.lifecycle.status === "assigned") assert.deepEqual(investigation.lifecycle.agentIds, [fixture.explorer]);
  const assignmentIndex = result.events.findIndex((event) => event.type === "investigation.assigned");
  const requestIndex = result.events.findIndex((event) => event.type === "investigation.requested");
  assert.ok(assignmentIndex > requestIndex);
  assert.ok(result.events.findLastIndex((event) => event.type === "observation.created") > requestIndex);
  assert.equal(result.observations.length, 3);
  assert.equal(new Set(result.observations.map((observation) => observation.agentId)).size, 2);
  assert.equal(result.failures.length, 0);
  assert.equal(maximumConcurrent, 2);
  assert.deepEqual(result.turns.map((turn) => turn.count), [1, 2]);
  assert.equal(result.simulation.lifecycle.status, "running");
  assert.ok(result.simulation.agents.every((agent) => agent.lifecycle.status === "running"));
  assert.ok(result.mappings.every((mapping) => mapping.agentId !== mapping.participantId));
  assert.equal(new Set(result.mappings.map((mapping) => mapping.participantId)).size, 2);
  assert.ok(result.events.every((event) => event.simulationId === fixture.simulation.id && event.correlationId === fixture.simulation.id));

  const request = result.events.find((event) => event.type === "investigation.requested");
  assert.ok(request);
  session.publishEvent(request);
  assert.throws(() => session.publishEvent({ ...request, correlationId: "changed-correlation" }), /different content/);
  const replayed = await session.waitForIdle();
  assert.deepEqual(replayed.turns, result.turns);
  assert.equal(replayed.events.length, result.events.length);
  assert.throws(() => session.publishEvent({ ...request, simulationId: simulationId("foreign") }), /simulation/i);
});

test("separate runtimes isolate IDs, state, events, and mutations", async (t) => {
  const firstFixture = scenario("first");
  const secondFixture = scenario("second");
  const first = createExplorationSession({ simulation: firstFixture.simulation, model: "fixture", runner: deterministicRunner(), allowedTools: firstFixture.permissions });
  const second = createExplorationSession({ simulation: secondFixture.simulation, model: "fixture", runner: deterministicRunner(), allowedTools: secondFixture.permissions });
  t.after(() => { first.close(); second.close(); });
  first.startTurn(firstFixture.beginner, "Explore");
  second.startTurn(secondFixture.beginner, "Explore");
  const results = await Promise.all([first.waitForIdle(), second.waitForIdle()]);
  for (const [index, result] of results.entries()) {
    assert.ok(result.events.every((event) => event.simulationId === (index === 0 ? "first" : "second")));
    assert.equal(result.failures.length, 0);
  }
  assert.notEqual(results[0]?.mappings[0]?.participantId, results[1]?.mappings[0]?.participantId);
});

test("callback failures are captured and do not become unhandled handler rejections", async (t) => {
  const fixture = scenario();
  const session = createExplorationSession({
    simulation: fixture.simulation, model: "fixture", runner: deterministicRunner(), allowedTools: fixture.permissions,
    async onEvent() { throw new Error("Consumer failed"); },
  });
  t.after(() => session.close());
  session.startTurn(fixture.beginner, "Explore");
  const result = await session.waitForIdle();
  assert.ok(result.failures.some((failure) => failure.stage === "handler"));
  assert.equal(result.investigations.length, 1);
});

test("turn budget bounds reactive activations and rejects new work after close", async (t) => {
  const fixture = scenario();
  const session = createExplorationSession({
    simulation: fixture.simulation, model: "fixture", runner: deterministicRunner(), allowedTools: fixture.permissions,
    maxTurnsPerAgent: 1,
  });
  t.after(() => session.close());
  session.startTurn(fixture.beginner, "Explore");
  session.startTurn(fixture.explorer, "Explore");
  const result = await session.waitForIdle();
  assert.deepEqual(result.turns.map((turn) => turn.count), [1, 1]);
  assert.equal(result.investigations[0]?.lifecycle.status, "requested");
  assert.equal(session.startTurn(fixture.beginner, "Another turn"), false);
  assert.throws(() => session.startTurn(agentId("outsider"), "Explore"), /not mapped/);
  session.close();
  assert.equal(session.startTurn(fixture.explorer, "Late work"), false);
  assert.equal(session.snapshot().closed, true);
  const event = result.events[0];
  assert.ok(event);
  assert.throws(() => session.publishEvent(event), /closed/);
});

test("session construction requires explicit cloud opt-out, active simulation, and valid budgets", () => {
  const fixture = scenario();
  const options = { simulation: fixture.simulation, model: "fixture", runner: deterministicRunner(), allowedTools: fixture.permissions };
  const previous = process.env.MOZAIK_API_KEY;
  try {
    delete process.env.MOZAIK_API_KEY;
    assert.throws(() => createExplorationSession(options), /disable Mozaik Cloud/);
  } finally { process.env.MOZAIK_API_KEY = previous ?? ""; }
  assert.throws(() => createExplorationSession({ ...options, durationMs: 0 }), /positive integer/);
  assert.throws(() => createExplorationSession({ ...options, maxTurnsPerAgent: -1 }), /positive integer/);
  assert.throws(() => createExplorationSession({ ...options, outboxMode: "external" }), /supplied storage/);
  assert.throws(() => createExplorationSession({ ...options, simulation: { ...fixture.simulation, lifecycle: { status: "completed" } } }), /running simulation/);
});
