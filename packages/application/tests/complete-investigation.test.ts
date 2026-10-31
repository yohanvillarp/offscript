import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId,
  assignInvestigation,
  DomainError,
  evidenceId,
  requestInvestigation,
  updateSimulationAgent,
} from "../../domain/index.ts";
import type { InvestigationId } from "../../domain/index.ts";
import { ApplicationError, executeCompleteInvestigation } from "../index.ts";
import type {
  CompleteInvestigationCommand,
  CompleteInvestigationDependencies,
  InvestigationCompletedEvent,
  VersionedInvestigation,
} from "../index.ts";
import { command, observation, runningSimulation } from "./memory-context.ts";

function completionFixture() {
  const sim = updateSimulationAgent(runningSimulation(), agentId("beginner"), { status: "running" });
  const simulations = new Map([[command().simulationId, sim]]);

  const requested = requestInvestigation(
    {
      id: command().investigationId,
      simulationId: command().simulationId,
      requestedBy: command().requestedBy,
      hypothesis: command().hypothesis,
      requestedAt: command().requestedAt,
    },
    [observation()],
  );

  const assigned = assignInvestigation(
    requested,
    [agentId("explorer")],
    "2026-10-30T12:01:00.000Z",
  );

  const records = new Map<InvestigationId, VersionedInvestigation>([
    [assigned.id, Object.freeze({ investigation: assigned, revision: 1 })],
  ]);
  const events: InvestigationCompletedEvent[] = [];
  const calls: string[] = [];

  const dependencies: CompleteInvestigationDependencies = {
    simulations: {
      async findSimulation(id) {
        calls.push("read-simulation");
        return simulations.get(id);
      },
    },
    investigations: {
      async findInvestigation(id) {
        calls.push("read-investigation");
        return records.get(id);
      },
      async commitCompletion(event, revision) {
        const inv = event.payload.investigation;
        calls.push("save");
        const current = records.get(inv.id);
        if (!current) return "not-found";
        if (current.revision !== revision) return "conflict";
        events.push(event);
        records.set(inv.id, Object.freeze({ investigation: inv, revision: revision + 1 }));
        return "saved";
      },
    },
  };

  const baseCommand: CompleteInvestigationCommand = {
    investigationId: assigned.id,
    simulationId: command().simulationId,
    completedBy: agentId("explorer"),
    result: {
      outcome: "supported",
      explanation: "Verified cart empties on reload.",
      evidenceIds: [evidenceId("capture-1")],
    },
    origin: { kind: "agent", agentId: agentId("explorer") },
    completedAt: "2026-10-30T12:02:00.000Z",
    eventId: "completion-event-1",
    correlationId: "exploration-1",
  };

  return { assigned, simulations, records, events, calls, dependencies, baseCommand };
}

test("commits investigation completion with queued event and incremented storage revision", async () => {
  const fixture = completionFixture();
  const result = await executeCompleteInvestigation(fixture.baseCommand, fixture.dependencies);

  assert.equal(result.revision, 2);
  assert.equal(result.investigation.lifecycle.status, "completed");
  if (result.investigation.lifecycle.status === "completed") {
    assert.equal(result.investigation.lifecycle.completedBy, agentId("explorer"));
    assert.equal(result.investigation.lifecycle.result.outcome, "supported");
    assert.deepEqual(result.investigation.lifecycle.result.evidenceIds, [evidenceId("capture-1")]);
  }
  assert.equal(result.event.type, "investigation.completed");
  assert.equal(result.publication.status, "queued");
  assert.deepEqual(fixture.calls, ["read-investigation", "read-simulation", "save"]);
});

test("rejects completion from an agent not in assigned collaborator roster", async () => {
  const fixture = completionFixture();
  await assert.rejects(
    executeCompleteInvestigation(
      {
        ...fixture.baseCommand,
        completedBy: agentId("beginner"),
        origin: { kind: "agent", agentId: agentId("beginner") },
      },
      fixture.dependencies,
    ),
    (err: unknown) => err instanceof DomainError && err.code === "AGENT_NOT_FOUND",
  );
});

test("rejects completion when storage revision does not match expected revision (CAS conflict)", async () => {
  const fixture = completionFixture();
  const dependencies: CompleteInvestigationDependencies = {
    ...fixture.dependencies,
    investigations: {
      ...fixture.dependencies.investigations,
      async commitCompletion() {
        return "conflict" as const;
      },
    },
  };

  await assert.rejects(
    executeCompleteInvestigation(fixture.baseCommand, dependencies),
    (err: unknown) => err instanceof ApplicationError && err.code === "INVESTIGATION_CONFLICT",
  );
});

test("rejects supported outcome without evidence references", async () => {
  const fixture = completionFixture();
  await assert.rejects(
    executeCompleteInvestigation(
      {
        ...fixture.baseCommand,
        result: {
          outcome: "supported",
          explanation: "Supported but no evidence",
          evidenceIds: [],
        },
      },
      fixture.dependencies,
    ),
    (err: unknown) => err instanceof DomainError && err.code === "INVALID_VALUE",
  );
});
