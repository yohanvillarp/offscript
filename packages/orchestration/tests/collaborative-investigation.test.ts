import assert from "node:assert/strict";
import { test } from "node:test";
import { updateSimulationAgent } from "../../domain/index.ts";
import { evaluateFindingAssessment } from "../../contracts/index.ts";
import { storage } from "../../persistence/tests/fixtures.ts";
import { createExplorationSession } from "../session.ts";
import { deterministicRunner } from "../deterministic-runner.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";
import type { ToolName } from "../state.ts";

test("collaborative multi-agent investigation completes with corroborated evidence and atomic outbox dispatch", async (t) => {
  const temp = storage(t);
  const db = temp.open();
  db.migrate();
  const fixture = scenario("collaborative-fixture");

  let simulation = fixture.simulation;
  for (const agent of simulation.agents) {
    simulation = updateSimulationAgent(simulation, agent.id, { status: "running" });
  }
  await db.simulations.createSimulation(simulation);

  const permissions = new Map(
    simulation.agents.map((agent) => [
      agent.id,
      [
        "inspect_application",
        "record_observation",
        "request_investigation",
        "complete_investigation",
      ] as const satisfies readonly ToolName[],
    ]),
  );

  const session = createExplorationSession({
    simulation,
    model: "collaborative-fixture",
    runner: deterministicRunner({ completeInvestigation: true }),
    allowedTools: permissions,
    storage: db,
  });

  try {
    session.startTurn(fixture.beginner, "Explore the cart and request an investigation if unexpected behavior is found.");
    session.startTurn(fixture.explorer, "Explore independently and collaborate on any requested investigations.");

    const result = await session.waitForIdle();
    assert.deepEqual(result.failures, []);

    // 1. Investigation completed lifecycle
    assert.equal(result.investigations.length, 1);
    const investigation = result.investigations[0];
    assert.ok(investigation);
    assert.equal(investigation.lifecycle.status, "completed");
    if (investigation.lifecycle.status === "completed") {
      assert.equal(investigation.lifecycle.completedBy, fixture.explorer);
      assert.equal(investigation.lifecycle.result.outcome, "supported");
      assert.ok(investigation.lifecycle.result.evidenceIds.length > 0);
    }

    // 2. Persistent storage and revision CAS verification
    const stored = await db.investigations.findInvestigation(investigation.id);
    assert.deepEqual(stored, { investigation, revision: 2 });

    // 3. Outbox delivery of all 3 investigation lifecycle events in order
    const events = result.events.filter((e) => e.type.startsWith("investigation."));
    assert.deepEqual(
      events.map((e) => e.type),
      ["investigation.requested", "investigation.assigned", "investigation.completed"],
    );
    for (const event of events) {
      assert.equal((await db.outbox.inspect(event.eventId))?.status, "accepted");
    }
    assert.equal(await db.outbox.hasPending(simulation.id), false);

    // 4. Finding assessment with explicit confirmation criteria
    const assessment = evaluateFindingAssessment(
      investigation as any,
      result.observations as any,
    );
    assert.equal(assessment.isConfirmedFinding, true);
    assert.equal(assessment.confidence, "corroborated");
    assert.equal(assessment.outcome, "supported");
    assert.deepEqual(assessment.participatingAgents, [fixture.beginner, fixture.explorer]);
  } finally {
    await session.close();
  }
});
