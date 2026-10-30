import assert from "node:assert/strict";
import { test } from "node:test";
import { ApplicationError, executeRequestInvestigation } from "../index.ts";
import { command, memoryContext } from "./memory-context.ts";

test("read adapter failures retain their cause and prevent writes/publication", async () => {
  for (const port of ["simulations", "observations"] as const) {
    const context = memoryContext();
    const cause = new Error("Storage unavailable");
    const dependencies = port === "simulations" ? {
      ...context.dependencies, simulations: { async findSimulation() { throw cause; } },
    } : {
      ...context.dependencies, observations: { async findObservation() { throw cause; } },
    };
    await assert.rejects(executeRequestInvestigation(command(), dependencies), (error: unknown) =>
      error instanceof ApplicationError && error.code === "READ_FAILED" && error.cause === cause);
    assert.equal(context.investigations.size, 0);
    assert.equal(context.events.length, 0);
  }
});

test("save failures retain their cause, do not publish, and are not automatically retried", async () => {
  const context = memoryContext();
  const cause = new Error("Commit failed");
  let saves = 0;
  const dependencies = { ...context.dependencies, investigations: { async createInvestigation() { saves++; throw cause; } } };
  await assert.rejects(executeRequestInvestigation(command(), dependencies), (error: unknown) =>
    error instanceof ApplicationError && error.code === "SAVE_FAILED" && error.cause === cause);
  assert.equal(saves, 1);
  assert.equal(context.events.length, 0);
});

test("publication rejection returns the saved request and exact event for explicit recovery", async () => {
  const context = memoryContext();
  const cause = new Error("Delivery not acknowledged");
  const result = await executeRequestInvestigation(command(), {
    ...context.dependencies, events: { async publishInvestigationRequested(event) {
      // A rejection can happen after delivery, so the result must not claim non-delivery.
      context.events.push(event);
      throw cause;
    } },
  });
  assert.equal(context.investigations.size, 1);
  assert.equal(context.events.length, 1);
  assert.equal(context.events[0], result.event);
  assert.equal(result.publication.status, "unconfirmed");
  if (result.publication.status === "unconfirmed") assert.equal(result.publication.cause, cause);
  assert.ok(Object.isFrozen(result.publication));
});

test("duplicate requests never overwrite the saved value or publish a second event", async () => {
  const context = memoryContext();
  const first = await executeRequestInvestigation(command(), context.dependencies);
  await assert.rejects(executeRequestInvestigation({ ...command(), hypothesis: "Different hypothesis" }, context.dependencies),
    (error: unknown) => error instanceof ApplicationError && error.code === "INVESTIGATION_ALREADY_EXISTS");
  assert.equal(context.investigations.get(command().investigationId), first.investigation);
  assert.equal(context.events.length, 1);
});

test("concurrent create-if-absent calls produce one investigation and one publication", async () => {
  const context = memoryContext();
  const results = await Promise.allSettled([
    executeRequestInvestigation(command(), context.dependencies), executeRequestInvestigation(command(), context.dependencies),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(context.investigations.size, 1);
  assert.equal(context.events.length, 1);
});

test("mutating caller-owned command fields during an awaited read cannot change the saved request", async () => {
  const context = memoryContext();
  const input = { ...command(), observationIds: [...command().observationIds] };
  const result = await executeRequestInvestigation(input, {
    ...context.dependencies, simulations: { async findSimulation(id) {
      input.hypothesis = "Changed during read";
      input.eventId = "changed-event";
      input.observationIds.length = 0;
      return context.dependencies.simulations.findSimulation(id);
    } },
  });
  assert.equal(result.investigation.hypothesis, command().hypothesis);
  assert.equal(result.event.eventId, command().eventId);
  assert.equal(result.investigation.observationIds.length, 1);
});
