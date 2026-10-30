import assert from "node:assert/strict";
import { test } from "node:test";
import { updateSimulationAgent } from "../../domain/index.ts";
import { storage } from "../../persistence/tests/fixtures.ts";
import { createExplorationSession } from "../index.ts";
import { deterministicRunner } from "../../../scripts/mozaik/deterministic-runner.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";

test("an explicitly prepared Mozaik session uses SQLite atomic request and assignment ports", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const fixture = scenario("durable-fixture");
  let simulation = fixture.simulation;
  for (const agent of simulation.agents) simulation = updateSimulationAgent(simulation, agent.id, { status: "running" });
  await db.simulations.createSimulation(simulation);
  const session = createExplorationSession({ simulation, model: "fixture", runner: deterministicRunner(),
    allowedTools: fixture.permissions, storage: db });
  try {
    session.startTurn(fixture.beginner, "Explore the cart");
    session.startTurn(fixture.explorer, "Explore independently");
    const result = await session.waitForIdle();
    assert.deepEqual(result.failures, []);
    assert.equal(result.observations.length, 3);
    for (const observation of result.observations) assert.deepEqual(await db.observations.findObservation(observation.id), observation);
    const investigation = result.investigations[0]; assert.ok(investigation);
    assert.equal(investigation.lifecycle.status, "assigned");
    assert.deepEqual(await db.investigations.findInvestigation(investigation.id), { investigation, revision: 1 });
    const events = result.events.filter(event => event.type.startsWith("investigation."));
    assert.deepEqual(events.map(event => event.type), ["investigation.requested", "investigation.assigned"]);
    for (const event of events) assert.equal((await db.outbox.inspect(event.eventId))?.status, "accepted");
    assert.equal(await db.outbox.hasPending(simulation.id), false);
  } finally { await session.close(); }
});
