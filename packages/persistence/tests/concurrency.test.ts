import assert from "node:assert/strict";
import { test } from "node:test";
import { agentId, assignInvestigation, observationId } from "../../domain/index.ts";
import { ApplicationError, executeAssignInvestigation, executeRequestInvestigation } from "../../application/index.ts";
import type { AssignInvestigationCommand, InvestigationAssignedEvent } from "../../application/index.ts";
import { fixture, seed, sqliteCode, storage } from "./fixtures.ts";

test("application requests and assignments execute against the actual SQLite ports", async (t) => {
  const db = storage(t).open(); db.migrate(); const source = fixture();
  await db.simulations.createSimulation(source.simulation);
  await db.observations.createObservation(source.observation);
  const requested = await executeRequestInvestigation({
    investigationId: source.investigation.id, simulationId: source.simulation.id, requestedBy: agentId("explorer"),
    observationIds: [source.observation.id], hypothesis: source.investigation.hypothesis,
    requestedAt: source.investigation.requestedAt, eventId: "request-1", correlationId: "shared-correlation",
  }, { simulations: db.simulations, observations: db.observations, investigations: db.investigations, events: { async publishInvestigationRequested() {} } });
  assert.equal(requested.publication.status, "published");
  const assigned = await executeAssignInvestigation({
    investigationId: requested.investigation.id, simulationId: source.simulation.id, agentIds: [agentId("beginner")],
    origin: { kind: "agent", agentId: agentId("beginner") }, assignedAt: "2026-10-30T12:01:00.000Z", eventId: "assignment-1", correlationId: "shared-correlation",
  }, { simulations: db.simulations, investigations: db.investigations, events: { async publishInvestigationAssigned() {} } });
  assert.equal(assigned.revision, 1);
  assert.deepEqual(await db.investigations.findInvestigation(source.investigation.id), { investigation: assigned.investigation, revision: 1 });
});

test("independent connections enforce CAS and a deliberate reload retains both collaborators", async (t) => {
  const temp = storage(t); const first = temp.open(); first.migrate(); const source = await seed(first);
  const second = temp.open(); second.migrate();
  const events: InvestigationAssignedEvent[] = [];
  const commands: AssignInvestigationCommand[] = ["beginner", "explorer"].map((name) => ({
    investigationId: source.investigation.id, simulationId: source.simulation.id, agentIds: [agentId(name)],
    origin: { kind: "system" }, assignedAt: "2026-10-30T12:01:00.000Z", eventId: `assigned-${name}`, correlationId: "correlation",
  }));
  const ports = [first, second].map((db) => ({ simulations: db.simulations, investigations: db.investigations, events: { async publishInvestigationAssigned(event: InvestigationAssignedEvent) { events.push(event); } } }));
  const outcomes = await Promise.allSettled(commands.map((command, index) => executeAssignInvestigation(command, ports[index]!)));
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const loser = outcomes.findIndex((outcome) => outcome.status === "rejected");
  const rejection = outcomes[loser];
  assert.ok(rejection?.status === "rejected" && rejection.reason instanceof ApplicationError && rejection.reason.code === "INVESTIGATION_CONFLICT");
  assert.equal(events.length, 1);
  const command = commands[loser]; assert.ok(command);
  const result = await executeAssignInvestigation(command, ports[loser]!);
  assert.equal(result.revision, 2);
  assert.equal(result.investigation.lifecycle.agentIds.length, 2);
  assert.equal((await first.investigations.findInvestigation(source.investigation.id))?.revision, 2);
});

test("failed assignment FK writes roll back revision and preserve the previous roster", async (t) => {
  const db = storage(t).open(); db.migrate(); const source = await seed(db);
  const initial = assignInvestigation(source.investigation, [agentId("beginner")], "2026-10-30T12:01:00.000Z");
  await db.investigations.saveAssignment(initial, 0);
  const invalid = assignInvestigation(initial, [agentId("outsider")], "2026-10-30T12:02:00.000Z");
  await assert.rejects(db.investigations.saveAssignment(invalid, 1), (error: unknown) => sqliteCode(error) === "SQLITE_CONSTRAINT_FOREIGNKEY");
  assert.deepEqual(await db.investigations.findInvestigation(source.investigation.id), { investigation: initial, revision: 1 });
  await assert.rejects(db.investigations.saveAssignment({ ...initial, hypothesis: "Overwritten" }, 1));
  assert.equal((await db.investigations.findInvestigation(source.investigation.id))?.revision, 1);
});

test("WAL permits reads during a writer transaction and competing writes honor a bounded busy timeout", async (t) => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const raw = temp.raw(); const competing = temp.open({ busyTimeoutMs: 20 });
  raw.client.exec("BEGIN IMMEDIATE");
  try {
    assert.deepEqual(await competing.observations.findObservation(source.observation.id), source.observation);
    const start = Date.now();
    await assert.rejects(competing.observations.createObservation({ ...source.observation, id: observationId("competing") }), (error: unknown) => sqliteCode(error) === "SQLITE_BUSY");
    assert.ok(Date.now() - start < 2_000);
  } finally { raw.client.exec("ROLLBACK"); }
  assert.equal(await competing.observations.createObservation({ ...source.observation, id: observationId("competing") }), "created");
});
