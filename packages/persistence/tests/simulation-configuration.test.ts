import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import { ApplicationError, executeConfigureSimulation } from "../../application/index.ts";
import { inspectProject } from "../../projects/index.ts";
import { seed, storage } from "./fixtures.ts";

const setup = () => parseSimulationSetup({ targetUrl: "http://localhost:3000", environment: { kind: "web", deployment: "local" },
  goal: "Find a product.", userProfileIds: ["explorer", "impatient", "beginner"] });

test("configuration creates ready users with a shared goal, survives reopen, and never starts a session or emits events", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  writeFileSync(join(temp.root, "package.json"), JSON.stringify({ name: "checkout" }));
  const id = simulationId("configured");
  const result = await executeConfigureSimulation({ simulationId: id, projectRoot: temp.root, setup: setup() },
    { projects: { inspectProject }, configurations: db.configurations });
  assert.equal(result.configuration.name, "checkout");
  assert.equal(result.simulation.lifecycle.status, "created");
  assert.deepEqual(result.simulation.agents.map(agent => agent.id), ["explorer", "impatient", "beginner"]);
  for (const agent of result.simulation.agents) {
    assert.equal(agent.lifecycle.status, "ready"); assert.deepEqual(agent.profile.goals, [{ description: "Find a product." }]);
    assert.deepEqual(agent.profile.capabilities, []);
  }
  assert.equal(await db.outbox.hasPending(id), false);
  db.close(); const reopened = temp.open(); reopened.migrate();
  assert.deepEqual(await reopened.configurations.findConfiguration(id), result.configuration);
  assert.deepEqual(await reopened.simulations.findSimulation(id), result.simulation);
  await assert.rejects(executeConfigureSimulation({ simulationId: id, projectRoot: temp.root, setup: { ...setup(), name: "Overwrite" } },
    { projects: { inspectProject }, configurations: reopened.configurations }), (error: unknown) =>
    error instanceof ApplicationError && error.code === "SIMULATION_ALREADY_EXISTS");
  assert.equal((await reopened.configurations.findConfiguration(id))?.name, "checkout");
});

test("explicit names override detection and existing snapshot-only records remain unchanged", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const old = await seed(db);
  assert.equal(await db.configurations.findConfiguration(old.simulation.id), undefined);
  const result = await executeConfigureSimulation({ simulationId: simulationId("named"), projectRoot: temp.root,
    setup: { ...setup(), name: "My exploration" } }, { projects: { inspectProject }, configurations: db.configurations });
  assert.equal(result.configuration.name, "My exploration");
});

test("failure inserting configuration rolls back the simulation and roster in the same transaction", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  temp.raw().client.exec("CREATE TRIGGER reject_configuration BEFORE INSERT ON simulation_configurations BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  const id = simulationId("rollback");
  await assert.rejects(executeConfigureSimulation({ simulationId: id, projectRoot: temp.root, setup: setup() },
    { projects: { inspectProject }, configurations: db.configurations }), (error: unknown) =>
    error instanceof ApplicationError && error.code === "SAVE_FAILED");
  assert.equal(await db.simulations.findSimulation(id), undefined);
  assert.equal(await db.configurations.findConfiguration(id), undefined);
  assert.deepEqual(temp.raw().client.prepare("SELECT id FROM agents").all(), []);
});

test("project inspection failures prevent configuration writes", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  writeFileSync(join(temp.root, "package.json"), "{invalid");
  const id = simulationId("invalid-project");
  await assert.rejects(executeConfigureSimulation({ simulationId: id, projectRoot: temp.root, setup: setup() },
    { projects: { inspectProject }, configurations: db.configurations }), (error: unknown) =>
    error instanceof ApplicationError && error.code === "PROJECT_INSPECTION_FAILED");
  assert.equal(await db.simulations.findSimulation(id), undefined);
});
