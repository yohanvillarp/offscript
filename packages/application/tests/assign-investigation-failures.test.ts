import assert from "node:assert/strict";
import { test } from "node:test";
import { agentId } from "../../domain/index.ts";
import { ApplicationError, executeAssignInvestigation } from "../index.ts";
import { assignmentCommand, assignmentContext } from "./assignment-context.ts";

test("read rejection preserves its cause and prevents save/publication", async () => {
  for (const scope of ["simulation", "investigation"] as const) {
    const context = assignmentContext();
    const cause = new Error("Read failed");
    const dependencies = scope === "simulation" ? {
      ...context.dependencies, simulations: { async findSimulation() { throw cause; } },
    } : { ...context.dependencies, investigations: {
      ...context.dependencies.investigations, async findInvestigation() { throw cause; },
    } };
    await assert.rejects(executeAssignInvestigation(assignmentCommand(), dependencies), (error: unknown) =>
      error instanceof ApplicationError && error.code === "READ_FAILED" && error.cause === cause);
    assert.equal(context.calls.includes("save"), false);
    assert.equal(context.events.length, 0);
  }
});

for (const outcome of ["conflict", "not-found"] as const) {
  test(`CAS ${outcome} cannot publish an unsaved assignment`, async () => {
    const context = assignmentContext();
    const dependencies = { ...context.dependencies, investigations: {
      ...context.dependencies.investigations, async saveAssignment() { return outcome; },
    } };
    await assert.rejects(executeAssignInvestigation(assignmentCommand(), dependencies), (error: unknown) =>
      error instanceof ApplicationError && error.code === (outcome === "conflict" ? "INVESTIGATION_CONFLICT" : "INVESTIGATION_NOT_FOUND"));
    assert.equal(context.events.length, 0);
    assert.equal(context.records.get(context.requested.id)?.revision, 0);
  });
}

test("save rejection after a possible commit reports uncertainty, does not publish, and does not retry", async () => {
  const context = assignmentContext();
  const cause = new Error("Acknowledgement lost");
  let calls = 0;
  const dependencies = { ...context.dependencies, investigations: {
    ...context.dependencies.investigations,
    async saveAssignment(...args: Parameters<typeof context.dependencies.investigations.saveAssignment>) {
      calls++;
      await context.dependencies.investigations.saveAssignment(...args);
      throw cause;
    },
  } };
  await assert.rejects(executeAssignInvestigation(assignmentCommand(), dependencies), (error: unknown) =>
    error instanceof ApplicationError && error.code === "SAVE_FAILED" && error.cause === cause);
  assert.equal(calls, 1);
  assert.equal(context.records.get(context.requested.id)?.revision, 1);
  assert.equal(context.events.length, 0);
});

test("publisher failure returns the saved snapshot, revision, and exact event with unconfirmed delivery", async () => {
  const context = assignmentContext();
  const cause = new Error("Delivery acknowledgement lost");
  const result = await executeAssignInvestigation(assignmentCommand(), {
    ...context.dependencies, events: { async publishInvestigationAssigned(event) { context.events.push(event); throw cause; } },
  });
  assert.equal(result.revision, 1);
  assert.equal(result.publication.status, "unconfirmed");
  if (result.publication.status === "unconfirmed") assert.equal(result.publication.cause, cause);
  assert.equal(result.event, context.events[0]);
  assert.equal(result.investigation, context.records.get(context.requested.id)?.investigation);
});

test("concurrent collaborators cannot overwrite each other; a deliberate reload can add the loser", async () => {
  const context = assignmentContext();
  const commands = [assignmentCommand(), { ...assignmentCommand(), agentIds: [agentId("beginner")], eventId: "assignment-2" }];
  const outcomes = await Promise.allSettled(commands.map((command) => executeAssignInvestigation(command, context.dependencies)));
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome) => outcome.status === "rejected");
  assert.ok(rejected?.status === "rejected" && rejected.reason instanceof ApplicationError && rejected.reason.code === "INVESTIGATION_CONFLICT");
  assert.equal(context.events.length, 1);
  assert.equal(context.records.get(context.requested.id)?.revision, 1);
  const loser = commands[outcomes.findIndex((outcome) => outcome.status === "rejected")];
  assert.ok(loser);
  const retried = await executeAssignInvestigation(loser, context.dependencies);
  assert.equal(retried.revision, 2);
  assert.equal(retried.investigation.lifecycle.agentIds.length, 2);
  assert.equal(new Set(retried.investigation.lifecycle.agentIds).size, 2);
  assert.equal(context.events.length, 2);
});

test("caller mutation during an awaited lookup cannot change assignees, origin or event metadata", async () => {
  const context = assignmentContext();
  const origin = { kind: "agent" as const, agentId: agentId("explorer") };
  const input = { ...assignmentCommand(), origin, agentIds: [agentId("explorer")] };
  const result = await executeAssignInvestigation(input, {
    ...context.dependencies, investigations: {
      ...context.dependencies.investigations, async findInvestigation(id) {
        input.agentIds[0] = agentId("beginner");
        origin.agentId = agentId("outsider");
        input.eventId = "changed-event";
        return context.dependencies.investigations.findInvestigation(id);
      },
    },
  });
  assert.deepEqual(result.investigation.lifecycle.agentIds, [agentId("explorer")]);
  assert.deepEqual(result.event.origin, { kind: "agent", agentId: agentId("explorer") });
  assert.equal(result.event.eventId, assignmentCommand().eventId);
});
