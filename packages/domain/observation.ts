import { DomainError, nonBlank } from "./errors.ts";
import { agentId, evidenceId, observationId, simulationId } from "./identity.ts";
import type { AgentId, EvidenceId, ObservationId, SimulationId } from "./identity.ts";
import { utcTimestamp } from "./timestamp.ts";

export type ObservationContext = Readonly<{
  location: string;
}>;

export type Observation = Readonly<{
  id: ObservationId;
  simulationId: SimulationId;
  agentId: AgentId;
  observedAt: string;
  description: string;
  context: ObservationContext;
  evidenceIds: readonly EvidenceId[];
}>;

export function createObservation(input: Observation): Observation {
  utcTimestamp(input.observedAt, "Observation time");
  const evidenceIds = input.evidenceIds.map(evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new DomainError("INVALID_VALUE", "Evidence references must be unique within an observation.");
  }
  return Object.freeze({
    id: observationId(input.id),
    simulationId: simulationId(input.simulationId),
    agentId: agentId(input.agentId),
    observedAt: input.observedAt,
    description: nonBlank(input.description, "Observation description"),
    context: Object.freeze({ location: nonBlank(input.context.location, "Observation location") }),
    evidenceIds: Object.freeze(evidenceIds),
  });
}
