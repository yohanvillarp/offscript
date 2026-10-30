import { createObservation, evidenceId, observationId } from "../domain/index.ts";
import type { Observation } from "../domain/index.ts";
import { ContractValidationError } from "./errors.ts";
import { readAgentId, readSimulationId, record, text, timestamp } from "./validation.ts";

// The immutable domain value already has the required public JSON fields.
export type ObservationSummary = Observation;

export function parseObservationSummary(value: unknown): ObservationSummary {
  const input = record(value, "observation", [
    "id", "simulationId", "agentId", "observedAt", "description", "context", "evidenceIds",
  ]);
  const context = record(input.context, "observation.context", ["location"]);
  if (!Array.isArray(input.evidenceIds)) {
    throw new ContractValidationError("observation.evidenceIds", "Expected an array.");
  }
  const evidenceIds = Array.from(input.evidenceIds, (id: unknown, index: number) =>
    evidenceId(text(id, `observation.evidenceIds[${index}]`)));
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new ContractValidationError("observation.evidenceIds", "Evidence references must be unique.");
  }
  return createObservation({
    id: observationId(text(input.id, "observation.id")),
    simulationId: readSimulationId(input.simulationId, "observation.simulationId"),
    agentId: readAgentId(input.agentId, "observation.agentId"),
    observedAt: timestamp(input.observedAt, "observation.observedAt"),
    description: text(input.description, "observation.description"),
    context: { location: text(context.location, "observation.context.location") },
    evidenceIds,
  });
}
