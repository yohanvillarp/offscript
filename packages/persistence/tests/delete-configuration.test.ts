import assert from "node:assert/strict";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { executeConfigureSimulation, executeDeleteConfiguredSimulation, ApplicationError } from "../../application/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import { inspectProject } from "../../projects/index.ts";
import { fixture, storage } from "./fixtures.ts";

const setup = parseSimulationSetup({ targetUrl: "http://localhost:3000", goal: "Find a product.",
  userProfileIds: ["explorer", "beginner"], environment: { kind: "web", deployment: "local" } });

test("deletion removes configuration and scoped roster durably, preserving another simulation with the same user IDs", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  for (const name of ["remove", "keep"]) await executeConfigureSimulation({ simulationId: simulationId(name), projectRoot: temp.root, setup },
    { projects: { inspectProject }, configurations: db.configurations });
  const id = simulationId("remove");
  assert.equal(await executeDeleteConfiguredSimulation(id, db.configurations), "deleted");
  assert.equal(await executeDeleteConfiguredSimulation(id, db.configurations), "not-found");
  db.close(); const reopened = temp.open();
  assert.equal(await reopened.simulations.findSimulation(id), undefined);
  assert.equal(await reopened.configurations.findConfiguration(id), undefined);
  assert.equal((await reopened.simulations.findSimulation(simulationId("keep")))?.agents.length, 2);
  assert.deepEqual(temp.raw().client.prepare("SELECT DISTINCT simulation_id FROM agents").all(), [{ simulation_id: "keep" }]);
});

test("deletion refuses active running lifecycles, and deletes terminal/observed simulations cleanly", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  const raw = temp.raw().client;
  for (const name of ["running", "agent-running", "terminal", "observed"]) {
    await executeConfigureSimulation({ simulationId: simulationId(name), projectRoot: temp.root, setup },
      { projects: { inspectProject }, configurations: db.configurations });
  }
  raw.prepare("UPDATE simulations SET status='running' WHERE id='running'").run();
  raw.prepare("UPDATE agents SET status='running' WHERE simulation_id='agent-running'").run();
  raw.prepare("UPDATE simulations SET status='cancelled' WHERE id='terminal'").run();
  await db.observations.createObservation(fixture("observed").observation);

  // Active running simulation or active running agent blocks deletion
  assert.equal(await db.configurations.deleteConfiguredSimulation(simulationId("running")), "not-allowed");
  assert.ok(await db.configurations.findConfiguration(simulationId("running")));
  assert.equal(await db.configurations.deleteConfiguredSimulation(simulationId("agent-running")), "not-allowed");
  assert.ok(await db.configurations.findConfiguration(simulationId("agent-running")));

  // Inactive / terminal / observed simulations are deleted cleanly
  assert.equal(await db.configurations.deleteConfiguredSimulation(simulationId("terminal")), "deleted");
  assert.equal(await db.configurations.findConfiguration(simulationId("terminal")), undefined);

  assert.equal(await db.configurations.deleteConfiguredSimulation(simulationId("observed")), "deleted");
  assert.equal(await db.configurations.findConfiguration(simulationId("observed")), undefined);
  assert.equal((await db.observations.listObservations(simulationId("observed"))).length, 0);

  const snapshot = fixture("snapshot-only").ready;
  await db.simulations.createSimulation(snapshot);
  assert.equal(await db.configurations.deleteConfiguredSimulation(snapshot.id), "not-found");
  assert.ok(await db.simulations.findSimulation(snapshot.id));
});

test("failure after deleting configuration and roster rolls back every write", async t => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const id = simulationId("rollback-delete");
  await executeConfigureSimulation({ simulationId: id, projectRoot: temp.root, setup }, { projects: { inspectProject }, configurations: db.configurations });
  temp.raw().client.exec("CREATE TRIGGER reject_delete BEFORE DELETE ON simulations BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  await assert.rejects(executeDeleteConfiguredSimulation(id, db.configurations), (error: unknown) => error instanceof ApplicationError && error.code === "DELETE_FAILED");
  assert.ok(await db.configurations.findConfiguration(id));
  assert.equal((await db.simulations.findSimulation(id))?.agents.length, 2);
});
