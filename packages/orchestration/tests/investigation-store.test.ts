import assert from "node:assert/strict";
import { test } from "node:test";
import { ApplicationError, executeAssignInvestigation } from "../../application/index.ts";
import type { AssignInvestigationCommand } from "../../application/index.ts";
import { investigationId } from "../../domain/index.ts";
import { sessionInvestigationStore } from "../investigation-store.ts";
import { reactionContext } from "./assignment-reaction-context.ts";

test("session-memory CAS rejects competing revisions without losing the winner's collaborators", async () => {
  const context = reactionContext();
  context.event();
  const requested = [...context.state.investigations.values()][0];
  assert.ok(requested);
  const store = sessionInvestigationStore(context.state);
  const dependencies = {
    simulations: { async findSimulation() { return context.state.simulation; } }, investigations: store,
    events: { async publishInvestigationAssigned() {} },
  };
  const commands: AssignInvestigationCommand[] = context.state.simulation.agents.map((agent, index) => ({
    investigationId: requested.investigation.id, simulationId: context.state.simulation.id,
    agentIds: [agent.id], origin: { kind: "system" }, assignedAt: new Date().toISOString(),
    eventId: `assignment-${index}`, correlationId: "shared-correlation",
  }));
  const outcomes = await Promise.allSettled(commands.map((command) => executeAssignInvestigation(command, dependencies)));
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const failed = outcomes.find((outcome) => outcome.status === "rejected");
  assert.ok(failed?.status === "rejected" && failed.reason instanceof ApplicationError && failed.reason.code === "INVESTIGATION_CONFLICT");
  assert.equal((await store.findInvestigation(requested.investigation.id))?.revision, 1);
  const loser = commands[outcomes.findIndex((outcome) => outcome.status === "rejected")];
  assert.ok(loser);
  const retried = await executeAssignInvestigation({ ...loser, assignedAt: new Date().toISOString() }, dependencies);
  assert.equal(retried.revision, 2);
  assert.equal(retried.investigation.lifecycle.agentIds.length, 2);
  assert.equal(await store.saveAssignment(retried.investigation, 0), "conflict");
  assert.equal((await store.findInvestigation(requested.investigation.id))?.revision, 2);
  assert.equal(await store.saveAssignment({ ...retried.investigation, id: investigationId("missing") }, 0), "not-found");
  context.state.closed = true;
  await assert.rejects(store.saveAssignment(retried.investigation, 2), /closed/);
});
