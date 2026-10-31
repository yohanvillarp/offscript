import assert from "node:assert/strict";
import { test } from "node:test";
import { ContractValidationError, parseSimulationResults } from "../index.ts";

test("parseSimulationResults parses valid payload with findings, observations, and investigations", () => {
  const payload = {
    simulationId: "simulation-1",
    observations: [
      {
        id: "observation-1",
        simulationId: "simulation-1",
        agentId: "explorer",
        observedAt: "2026-10-30T12:00:00.000Z",
        description: "Cart item disappeared",
        context: { location: "/cart" },
        evidenceIds: ["ev-1"],
      },
    ],
    investigations: [
      {
        id: "investigation-1",
        simulationId: "simulation-1",
        requestedBy: "explorer",
        hypothesis: "Cart persistence is broken",
        requestedAt: "2026-10-30T12:01:00.000Z",
        observationIds: ["observation-1"],
        lifecycle: {
          status: "completed",
          agentIds: ["explorer", "impatient"],
          assignedAt: "2026-10-30T12:02:00.000Z",
          completedBy: "impatient",
          completedAt: "2026-10-30T12:03:00.000Z",
          result: {
            outcome: "supported",
            explanation: "Verified cart does not persist items after refresh.",
            evidenceIds: ["ev-1"],
          },
        },
      },
    ],
    findings: [
      {
        investigationId: "investigation-1",
        hypothesis: "Cart persistence is broken",
        outcome: "supported",
        confidence: "corroborated",
        explanation: "Verified cart does not persist items after refresh.",
        isConfirmedFinding: true,
        participatingAgents: ["explorer", "impatient"],
        evidenceIds: ["ev-1"],
      },
    ],
  };

  const parsed = parseSimulationResults(payload);
  assert.equal(parsed.simulationId, "simulation-1");
  assert.equal(parsed.observations.length, 1);
  assert.equal(parsed.observations[0]?.id, "observation-1");
  assert.equal(parsed.investigations.length, 1);
  assert.equal(parsed.investigations[0]?.id, "investigation-1");
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0]?.isConfirmedFinding, true);
  assert.equal(parsed.findings[0]?.confidence, "corroborated");
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.observations));
  assert.ok(Object.isFrozen(parsed.investigations));
  assert.ok(Object.isFrozen(parsed.findings));
});

test("parseSimulationResults rejects invalid shapes", () => {
  assert.throws(() => parseSimulationResults(null), ContractValidationError);
  assert.throws(() => parseSimulationResults({ simulationId: "", observations: [], investigations: [], findings: [] }), ContractValidationError);
  assert.throws(() => parseSimulationResults({ simulationId: "sim-1", observations: "not-array", investigations: [], findings: [] }), ContractValidationError);
  assert.throws(() => parseSimulationResults({ simulationId: "sim-1", observations: [], investigations: "not-array", findings: [] }), ContractValidationError);
  assert.throws(() => parseSimulationResults({ simulationId: "sim-1", observations: [], investigations: [], findings: "not-array" }), ContractValidationError);
  assert.throws(() => parseSimulationResults({
    simulationId: "sim-1", observations: [], investigations: [],
    findings: [{
      investigationId: "inv-1", hypothesis: "hyp", outcome: "invalid-outcome",
      confidence: "provisional", explanation: "exp", isConfirmedFinding: true,
      participatingAgents: [], evidenceIds: [],
    }],
  }), ContractValidationError);
});
