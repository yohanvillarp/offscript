import { createInvestigationResult, evidenceId, investigationId, observationId } from "../domain/index.ts";
import type { Investigation, InvestigationLifecycle, InvestigationResult } from "../domain/index.ts";
import { ContractValidationError } from "./errors.ts";
import { oneOf, readAgentId, readSimulationId, record, text, timestamp } from "./validation.ts";

export type InvestigationSummary = Investigation;

function references<T>(value: unknown, path: string, read: (value: string) => T, required: boolean): readonly T[] {
  if (!Array.isArray(value)) throw new ContractValidationError(path, "Expected an array.");
  const values = Array.from(value, (entry: unknown, index: number) => read(text(entry, `${path}[${index}]`)));
  if (new Set(values).size !== values.length || (required && values.length === 0)) {
    throw new ContractValidationError(path, "References must be unique and the required list must not be empty.");
  }
  return Object.freeze(values);
}

export function parseInvestigationResult(value: unknown): InvestigationResult {
  const path = "investigation.lifecycle.result";
  const input = record(value, path, ["outcome", "explanation", "evidenceIds"]);
  const outcome = oneOf(input.outcome, ["supported", "contradicted", "inconclusive"], `${path}.outcome`);
  return createInvestigationResult({
    outcome, explanation: text(input.explanation, `${path}.explanation`),
    evidenceIds: references(input.evidenceIds, `${path}.evidenceIds`, evidenceId, outcome !== "inconclusive"),
  });
}

function lifecycle(value: unknown, requestedAt: string): InvestigationLifecycle {
  const path = "investigation.lifecycle";
  const shape = record(value, path, ["status", "agentIds", "assignedAt", "completedAt", "completedBy", "result"]);
  const status = oneOf(shape.status, ["requested", "assigned", "completed"], `${path}.status`);
  if (status === "requested") {
    record(value, path, ["status"]);
    return Object.freeze({ status });
  }
  if (status === "assigned") record(value, path, ["status", "agentIds", "assignedAt"]);
  const agentIds = references(shape.agentIds, `${path}.agentIds`, (id) => readAgentId(id, `${path}.agentIds`), true);
  const assignedAt = timestamp(shape.assignedAt, `${path}.assignedAt`);
  if (assignedAt < requestedAt) throw new ContractValidationError(`${path}.assignedAt`, "Assignment precedes request.");
  if (status === "assigned") return Object.freeze({ status, agentIds, assignedAt });
  const completedBy = readAgentId(shape.completedBy, `${path}.completedBy`);
  const completedAt = timestamp(shape.completedAt, `${path}.completedAt`);
  if (!agentIds.includes(completedBy)) {
    throw new ContractValidationError(`${path}.completedBy`, "Result author must be an assigned agent.");
  }
  if (completedAt < assignedAt) throw new ContractValidationError(`${path}.completedAt`, "Completion precedes assignment.");
  return Object.freeze({ status, agentIds, assignedAt, completedBy, completedAt, result: parseInvestigationResult(shape.result) });
}

export function parseInvestigationSummary(value: unknown): InvestigationSummary {
  const input = record(value, "investigation", [
    "id", "simulationId", "requestedBy", "hypothesis", "requestedAt", "observationIds", "lifecycle",
  ]);
  const requestedAt = timestamp(input.requestedAt, "investigation.requestedAt");
  return Object.freeze({
    id: investigationId(text(input.id, "investigation.id")),
    simulationId: readSimulationId(input.simulationId, "investigation.simulationId"),
    requestedBy: readAgentId(input.requestedBy, "investigation.requestedBy"),
    hypothesis: text(input.hypothesis, "investigation.hypothesis"), requestedAt,
    observationIds: references(input.observationIds, "investigation.observationIds", observationId, true),
    lifecycle: lifecycle(input.lifecycle, requestedAt),
  });
}
