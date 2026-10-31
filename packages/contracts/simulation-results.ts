import type { ObservationSummary } from "./observation-summary.ts";
import { parseObservationSummary } from "./observation-summary.ts";
import type { InvestigationSummary } from "./investigation-summary.ts";
import { parseInvestigationSummary } from "./investigation-summary.ts";
import type { FindingAssessment } from "./finding-assessment.ts";
import { oneOf, readSimulationId, record, text } from "./validation.ts";
import { ContractValidationError } from "./errors.ts";

export type SimulationResults = Readonly<{
  simulationId: string;
  observations: readonly ObservationSummary[];
  investigations: readonly InvestigationSummary[];
  findings: readonly FindingAssessment[];
}>;

function parseFindingAssessment(value: unknown, path: string): FindingAssessment {
  const item = record(value, path, [
    "investigationId", "hypothesis", "outcome", "confidence", "explanation", "isConfirmedFinding", "participatingAgents", "evidenceIds",
  ]);
  const outcome = oneOf(item.outcome, ["supported", "contradicted", "inconclusive"], `${path}.outcome`);
  const confidence = oneOf(item.confidence, ["provisional", "corroborated", "inconclusive", "refuted"], `${path}.confidence`);
  if (typeof item.isConfirmedFinding !== "boolean") {
    throw new ContractValidationError(`${path}.isConfirmedFinding`, "Expected a boolean.");
  }
  if (!Array.isArray(item.participatingAgents)) {
    throw new ContractValidationError(`${path}.participatingAgents`, "Expected an array.");
  }
  if (!Array.isArray(item.evidenceIds)) {
    throw new ContractValidationError(`${path}.evidenceIds`, "Expected an array.");
  }
  return Object.freeze({
    investigationId: text(item.investigationId, `${path}.investigationId`),
    hypothesis: text(item.hypothesis, `${path}.hypothesis`),
    outcome,
    confidence,
    explanation: text(item.explanation, `${path}.explanation`),
    isConfirmedFinding: item.isConfirmedFinding,
    participatingAgents: Object.freeze(item.participatingAgents.map((a, i) => text(a, `${path}.participatingAgents[${i}]`))),
    evidenceIds: Object.freeze(item.evidenceIds.map((e, i) => text(e, `${path}.evidenceIds[${i}]`))),
    ...("uncertaintyReason" in item && typeof item.uncertaintyReason === "string" ? { uncertaintyReason: item.uncertaintyReason } : {}),
  });
}

export function parseSimulationResults(value: unknown): SimulationResults {
  const input = record(value, "simulationResults", [
    "simulationId", "observations", "investigations", "findings",
  ]);
  const simulationId = readSimulationId(input.simulationId, "simulationResults.simulationId");
  if (!Array.isArray(input.observations)) {
    throw new ContractValidationError("simulationResults.observations", "Expected an array.");
  }
  if (!Array.isArray(input.investigations)) {
    throw new ContractValidationError("simulationResults.investigations", "Expected an array.");
  }
  if (!Array.isArray(input.findings)) {
    throw new ContractValidationError("simulationResults.findings", "Expected an array.");
  }
  return Object.freeze({
    simulationId,
    observations: Object.freeze(input.observations.map(obs => parseObservationSummary(obs))),
    investigations: Object.freeze(input.investigations.map(inv => parseInvestigationSummary(inv))),
    findings: Object.freeze(input.findings.map((f, i) => parseFindingAssessment(f, `simulationResults.findings[${i}]`))),
  });
}
