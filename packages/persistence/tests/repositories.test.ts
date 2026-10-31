import assert from "node:assert/strict";
import { test } from "node:test";
import { agentId, assignInvestigation, createSimulation, observationId, simulationId, transitionSimulation, updateSimulationAgent } from "../../domain/index.ts";
import { PersistenceError } from "../index.ts";
import { fixture, seed, sqliteCode, storage } from "./fixtures.ts";

test("all repositories survive close/reopen with immutable snapshots and ordered relationships", async (t) => {
  const temp = storage(t);
  const first = temp.open({ dataDirectory: "data with spaces/estudio" });
  first.migrate();
  const source = await seed(first);
  const assigned = assignInvestigation(source.investigation, [agentId("beginner"), agentId("explorer")], "2026-10-30T12:01:00.000Z");
  assert.equal(await first.investigations.saveAssignment(assigned, 0), "saved");
  first.close();
  first.close();
  const second = temp.open({ dataDirectory: "data with spaces/estudio" });
  second.migrate();
  assert.equal(second.databasePath, first.databasePath);
  const simulation = await second.simulations.findSimulation(source.simulation.id);
  const observation = await second.observations.findObservation(source.observation.id);
  const investigation = await second.investigations.findInvestigation(source.investigation.id);
  assert.deepEqual(simulation, source.simulation);
  assert.deepEqual(observation, source.observation);
  assert.deepEqual(investigation, { investigation: assigned, revision: 1 });
  assert.ok(Object.isFrozen(simulation?.agents));
  assert.ok(Object.isFrozen(simulation?.agents[0]?.profile.goals));
  assert.ok(Object.isFrozen(observation?.evidenceIds));
  assert.ok(Object.isFrozen(investigation?.investigation.lifecycle));
  assert.equal(await second.simulations.findSimulation(simulationId("missing")), undefined);
  assert.equal(await second.observations.findObservation(observationId("missing")), undefined);
});

test("create-if-absent never overwrites existing simulations, observations or requests", async (t) => {
  const db = storage(t).open();
  db.migrate();
  const source = await seed(db);
  assert.equal(await db.simulations.createSimulation(source.simulation), "already-exists");
  assert.equal(await db.observations.createObservation({ ...source.observation, description: "Changed" }), "already-exists");
  assert.equal(await db.investigations.createInvestigation({ ...source.investigation, hypothesis: "Changed" }), "already-exists");
  assert.deepEqual(await db.observations.findObservation(source.observation.id), source.observation);
  assert.deepEqual((await db.investigations.findInvestigation(source.investigation.id))?.investigation, source.investigation);
});

test("restores every simulation lifecycle, including empty cancellation, without resuming execution", async (t) => {
  const db = storage(t).open(); db.migrate();
  const source = fixture();
  const cancelled = transitionSimulation(source.simulation, { status: "cancelled" });
  const failed = transitionSimulation(source.simulation, { status: "failed", reason: "Target unavailable" });
  const settled = updateSimulationAgent(updateSimulationAgent(source.simulation, agentId("beginner"), { status: "failed", reason: "Stopped" }), agentId("explorer"), { status: "cancelled" });
  const completed = transitionSimulation(settled, { status: "completed" });
  const empty = transitionSimulation(createSimulation(simulationId("empty"), source.simulation.environment, []), { status: "cancelled" });
  for (const [index, value] of [source.ready, source.simulation, cancelled, failed, completed, empty].entries()) {
    const snapshot = { ...value, id: simulationId(`snapshot-${index}`) };
    await db.simulations.createSimulation(snapshot);
    assert.deepEqual(await db.simulations.findSimulation(snapshot.id), snapshot);
  }
});

test("foreign keys reject orphan authors and cross-simulation observation links with full rollback", async (t) => {
  const db = storage(t).open(); db.migrate();
  const first = fixture("first"); const second = fixture("second");
  await db.simulations.createSimulation(first.simulation);
  await db.simulations.createSimulation(second.simulation);
  await db.observations.createObservation(second.observation);
  await assert.rejects(db.observations.createObservation({ ...first.observation, agentId: agentId("outsider") }), (error: unknown) => sqliteCode(error) === "SQLITE_CONSTRAINT_FOREIGNKEY");
  await assert.rejects(db.investigations.createInvestigation({ ...first.investigation, observationIds: [second.observation.id] }), (error: unknown) => sqliteCode(error) === "SQLITE_CONSTRAINT_FOREIGNKEY");
  assert.equal(await db.investigations.findInvestigation(first.investigation.id), undefined);
});

test("database failures roll back a whole simulation and its agent roster", async (t) => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  const raw = temp.raw();
  raw.client.exec("CREATE TRIGGER reject_second_agent BEFORE INSERT ON agents WHEN NEW.position = 1 BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  const source = fixture();
  await assert.rejects(db.simulations.createSimulation(source.simulation));
  assert.equal(await db.simulations.findSimulation(source.simulation.id), undefined);
  assert.equal(raw.client.prepare<[], { count: number }>("SELECT count(*) AS count FROM agents").get()?.count, 0);
});

test("corrupt stored profile/evidence/link shapes are rejected rather than cast to domain objects", async (t) => {
  const temp = storage(t); const db = temp.open(); db.migrate();
  const source = await seed(db); const raw = temp.raw();
  raw.client.prepare("UPDATE agents SET profile = ? WHERE id = ?").run(JSON.stringify({ name: "User", personality: "Curious", goals: null, capabilities: [] }), "beginner");
  await assert.rejects(db.simulations.findSimulation(source.simulation.id), PersistenceError);
  raw.client.prepare("UPDATE observations SET evidence_ids = '{}' WHERE id = ?").run(source.observation.id);
  await assert.rejects(db.observations.findObservation(source.observation.id), PersistenceError);
  raw.client.prepare("DELETE FROM investigation_observations WHERE investigation_id = ?").run(source.investigation.id);
  await assert.rejects(db.investigations.findInvestigation(source.investigation.id), PersistenceError);
});

test("updateSimulationAggregate atomically updates simulation and agents with conflict rejection", async (t) => {
  const db = storage(t).open(); db.migrate();
  const source = fixture();
  await db.simulations.createSimulation(source.ready);
  const runningSim = transitionSimulation(source.ready, { status: "running" });
  const runningAgents = updateSimulationAgent(updateSimulationAgent(runningSim, agentId("beginner"), { status: "running" }), agentId("explorer"), { status: "running" });

  // Wrong expected status -> conflict
  const conflictSim = await db.simulations.updateSimulationAggregate(runningAgents, { status: "running" });
  assert.equal(conflictSim, "conflict");

  // Wrong expected agent status -> conflict
  const conflictAgent = await db.simulations.updateSimulationAggregate(runningAgents, {
    status: "created",
    agentStatuses: new Map([[agentId("beginner"), "running"]]),
  });
  assert.equal(conflictAgent, "conflict");

  // Missing simulation -> not-found
  const missing = await db.simulations.updateSimulationAggregate({ ...runningAgents, id: simulationId("missing") }, { status: "created" });
  assert.equal(missing, "not-found");

  // Correct update -> updated
  const updated = await db.simulations.updateSimulationAggregate(runningAgents, {
    status: "created",
    agentStatuses: new Map([[agentId("beginner"), "ready"], [agentId("explorer"), "ready"]]),
  });
  assert.equal(updated, "updated");

  const restored = await db.simulations.findSimulation(source.ready.id);
  assert.equal(restored?.lifecycle.status, "running");
  assert.equal(restored?.agents[0]?.lifecycle.status, "running");
  assert.equal(restored?.agents[1]?.lifecycle.status, "running");
});

