import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentId,
  evidenceId,
  investigationId,
  observationId,
  simulationId,
} from "../../domain/index.ts";
import { evaluateFindingAssessment } from "../index.ts";
import type { CompletedInvestigationSummary } from "../index.ts";

function sampleInvestigation(
  overrides?: Partial<CompletedInvestigationSummary>,
): CompletedInvestigationSummary {
  return {
    id: investigationId("investigation-1"),
    simulationId: simulationId("simulation-1"),
    requestedBy: agentId("agent-1"),
    hypothesis: "Cart state does not survive reload.",
    requestedAt: "2026-10-30T12:00:00.000Z",
    observationIds: [observationId("obs-1")],
    lifecycle: {
      status: "completed",
      agentIds: [agentId("agent-2")],
      assignedAt: "2026-10-30T12:01:00.000Z",
      completedAt: "2026-10-30T12:02:00.000Z",
      completedBy: agentId("agent-2"),
      result: {
        outcome: "supported",
        explanation: "Verified cart reset to zero items.",
        evidenceIds: [evidenceId("ev-1")],
      },
    },
    ...overrides,
  };
}

test("evaluates corroborated finding when distinct agents collaborate and evidence matches", () => {
  const inv = sampleInvestigation();
  const assessment = evaluateFindingAssessment(inv, [
    {
      id: observationId("obs-1"),
      simulationId: simulationId("simulation-1"),
      agentId: agentId("agent-1"),
      observedAt: "2026-10-30T12:00:30.000Z",
      description: "Cart has items before reload",
      context: { location: "/cart" },
      evidenceIds: [evidenceId("ev-initial")],
    },
    {
      id: observationId("obs-2"),
      simulationId: simulationId("simulation-1"),
      agentId: agentId("agent-2"),
      observedAt: "2026-10-30T12:01:30.000Z",
      description: "Cart is empty after reload",
      context: { location: "/cart" },
      evidenceIds: [evidenceId("ev-1")],
    },
  ]);

  assert.equal(assessment.isConfirmedFinding, true);
  assert.equal(assessment.confidence, "corroborated");
  assert.equal(assessment.outcome, "supported");
  assert.equal(assessment.uncertaintyReason, undefined);
  assert.deepEqual(assessment.participatingAgents, [agentId("agent-1"), agentId("agent-2")]);
});

test("evaluates provisional finding when observations list is empty despite cited evidence", () => {
  const inv = sampleInvestigation();
  const assessment = evaluateFindingAssessment(inv, []);

  assert.equal(assessment.isConfirmedFinding, false);
  assert.equal(assessment.confidence, "provisional");
  assert.ok(assessment.uncertaintyReason?.includes("no simulation observations are available"));
});

test("evaluates provisional finding when supported outcome provides no evidence references", () => {
  const inv = sampleInvestigation({
    lifecycle: {
      status: "completed",
      agentIds: [agentId("agent-2")],
      assignedAt: "2026-10-30T12:01:00.000Z",
      completedAt: "2026-10-30T12:02:00.000Z",
      completedBy: agentId("agent-2"),
      result: {
        outcome: "supported",
        explanation: "Observed problem without capturing evidence.",
        evidenceIds: [],
      },
    },
  });
  const assessment = evaluateFindingAssessment(inv, [
    {
      id: observationId("obs-1"),
      simulationId: simulationId("simulation-1"),
      agentId: agentId("agent-1"),
      observedAt: "2026-10-30T12:00:30.000Z",
      description: "Initial observation",
      context: { location: "/cart" },
      evidenceIds: [evidenceId("ev-initial")],
    },
  ]);

  assert.equal(assessment.isConfirmedFinding, false);
  assert.equal(assessment.confidence, "provisional");
  assert.ok(assessment.uncertaintyReason?.includes("does not reference any supporting evidence"));
});

test("evaluates provisional finding when only one agent requested and completed without collaborators", () => {
  const inv = sampleInvestigation({
    requestedBy: agentId("agent-1"),
    lifecycle: {
      status: "completed",
      agentIds: [agentId("agent-1")],
      assignedAt: "2026-10-30T12:01:00.000Z",
      completedAt: "2026-10-30T12:02:00.000Z",
      completedBy: agentId("agent-1"),
      result: {
        outcome: "supported",
        explanation: "Self-assessed issue.",
        evidenceIds: [evidenceId("ev-1")],
      },
    },
  });

  const assessment = evaluateFindingAssessment(inv, [
    {
      id: observationId("obs-1"),
      simulationId: simulationId("simulation-1"),
      agentId: agentId("agent-1"),
      observedAt: "2026-10-30T12:01:30.000Z",
      description: "Cart empty",
      context: { location: "/cart" },
      evidenceIds: [evidenceId("ev-1")],
    },
  ]);

  assert.equal(assessment.isConfirmedFinding, false);
  assert.equal(assessment.confidence, "provisional");
  assert.ok(assessment.uncertaintyReason?.includes("without independent collaborator corroboration"));
});

test("evaluates provisional finding when evidence identifier is unverified in simulation observations", () => {
  const inv = sampleInvestigation();
  const assessment = evaluateFindingAssessment(inv, [
    {
      id: observationId("obs-1"),
      simulationId: simulationId("simulation-1"),
      agentId: agentId("agent-2"),
      observedAt: "2026-10-30T12:01:30.000Z",
      description: "Cart empty",
      context: { location: "/cart" },
      evidenceIds: [evidenceId("different-ev")],
    },
  ]);

  assert.equal(assessment.isConfirmedFinding, false);
  assert.equal(assessment.confidence, "provisional");
  assert.ok(assessment.uncertaintyReason?.includes("unverified in observed simulation data"));
});

test("evaluates inconclusive and contradicted assessments with explicit uncertainty", () => {
  const inconclusive = evaluateFindingAssessment(
    sampleInvestigation({
      lifecycle: {
        status: "completed",
        agentIds: [agentId("agent-2")],
        assignedAt: "2026-10-30T12:01:00.000Z",
        completedAt: "2026-10-30T12:02:00.000Z",
        completedBy: agentId("agent-2"),
        result: {
          outcome: "inconclusive",
          explanation: "Could not reproduce discrepancy.",
          evidenceIds: [],
        },
      },
    }),
  );
  assert.equal(inconclusive.isConfirmedFinding, false);
  assert.equal(inconclusive.confidence, "inconclusive");

  const contradicted = evaluateFindingAssessment(
    sampleInvestigation({
      lifecycle: {
        status: "completed",
        agentIds: [agentId("agent-2")],
        assignedAt: "2026-10-30T12:01:00.000Z",
        completedAt: "2026-10-30T12:02:00.000Z",
        completedBy: agentId("agent-2"),
        result: {
          outcome: "contradicted",
          explanation: "Cart persisted normally across reload.",
          evidenceIds: [evidenceId("ev-persisted")],
        },
      },
    }),
  );
  assert.equal(contradicted.isConfirmedFinding, false);
  assert.equal(contradicted.confidence, "refuted");
});
