import assert from "node:assert/strict";
import { test } from "node:test";
import { updateSimulationAgent } from "../../domain/index.ts";
import { createExplorationSession } from "../index.ts";
import { hostContext } from "../../runtime/tests/host-context.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";
import { deterministicRunner } from "../../../scripts/mozaik/deterministic-runner.ts";

test("two Mozaik sessions share the host dispatcher without claiming from their own session loops", async t => {
  const temp = hostContext(t); const db = temp.open(); db.migrate();
  const host = temp.host(); await host.start();
  let sessionClaims = 0;
  const sessions: ReturnType<typeof createExplorationSession>[] = [];
  for (const name of ["hosted-first", "hosted-second"]) {
    const fixture = scenario(name);
    let simulation = fixture.simulation;
    for (const agent of simulation.agents) simulation = updateSimulationAgent(simulation, agent.id, { status: "running" });
    await db.simulations.createSimulation(simulation);
    const session = host.prepareSession(simulation.id, context => createExplorationSession({
      ...context, simulation, model: "fixture", allowedTools: fixture.permissions, runner: deterministicRunner(),
      storage: { ...context.storage, outbox: { ...context.storage.outbox, async claim(options) {
        sessionClaims++; return context.storage.outbox.claim(options);
      } } },
    }));
    sessions.push(session);
    session.startTurn(fixture.beginner, "Explore the cart");
    session.startTurn(fixture.explorer, "Explore independently");
  }
  const results = await Promise.all(sessions.map(session => session.waitForIdle()));
  for (const result of results) {
    assert.deepEqual(result.failures, []); assert.equal(result.observations.length, 3);
    assert.equal(result.investigations[0]?.lifecycle.status, "assigned");
    for (const event of result.events.filter(event => event.type.startsWith("investigation."))) {
      assert.equal((await db.outbox.inspect(event.eventId))?.status, "accepted");
    }
  }
  assert.equal(sessionClaims, 0);
  await host.close();
  assert.ok(sessions.every(session => session.snapshot().closed));
});
