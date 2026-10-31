import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSimulationResults, parseSimulationExecutionStatus } from "../../../packages/contracts/index.ts";
import { participantCatalog } from "../src/shared/model/participants.ts";

test("simulation results associate findings and observations with known participants", () => {
  const payload = {
    simulationId: "sim-1",
    observations: [
      {
        id: "obs-1",
        simulationId: "sim-1",
        agentId: "explorer",
        observedAt: "2026-10-30T12:00:00.000Z",
        description: "Button does nothing on click.",
        context: { location: "http://localhost:5173/products" },
        evidenceIds: ["ev-1"],
      },
    ],
    investigations: [
      {
        id: "inv-1",
        simulationId: "sim-1",
        requestedBy: "explorer",
        hypothesis: "Product button is disabled without feedback.",
        requestedAt: "2026-10-30T12:01:00.000Z",
        observationIds: ["obs-1"],
        lifecycle: {
          status: "completed",
          agentIds: ["explorer", "impatient"],
          assignedAt: "2026-10-30T12:02:00.000Z",
          completedBy: "impatient",
          completedAt: "2026-10-30T12:03:00.000Z",
          result: {
            outcome: "supported",
            explanation: "Verified button has no onClick handler.",
            evidenceIds: ["ev-1"],
          },
        },
      },
    ],
    findings: [
      {
        investigationId: "inv-1",
        hypothesis: "Product button is disabled without feedback.",
        outcome: "supported",
        confidence: "corroborated",
        explanation: "Verified button has no onClick handler.",
        isConfirmedFinding: true,
        participatingAgents: ["explorer", "impatient"],
        evidenceIds: ["ev-1"],
      },
    ],
  };

  const results = parseSimulationResults(payload);
  assert.equal(results.simulationId, "sim-1");
  assert.equal(results.findings.length, 1);
  assert.equal(results.findings[0]?.isConfirmedFinding, true);

  const participant = participantCatalog.find(
    (p) => p.profileId === results.observations[0]?.agentId,
  );
  assert.ok(participant);
  assert.equal(participant.name, "Raven");
  assert.equal(participant.profile, "Explorer");

  const participants = results.findings[0]?.participatingAgents.map((agentId) =>
    participantCatalog.find((p) => p.profileId === agentId)?.name,
  );
  assert.deepEqual(participants, ["Raven", "Fox"]);
});

test("simulation execution status parses recent activity for live observability", () => {
  const parsed = parseSimulationExecutionStatus({
    simulationId: "sim-1",
    phase: "running",
    mode: "browser-exploration",
    turnsCount: 2,
    activeAgents: ["explorer"],
    recentActivity: [
      { agentId: "explorer", action: "navigate", location: "/", timestamp: "2026-10-31T01:00:00.000Z" },
      { agentId: "explorer", action: "click", location: "elem_1", timestamp: "2026-10-31T01:00:01.000Z" },
    ],
  });
  assert.equal(parsed.recentActivity?.length, 2);
  assert.equal(parsed.recentActivity?.[0]?.action, "navigate");
  assert.equal(parsed.recentActivity?.[1]?.action, "click");
});
