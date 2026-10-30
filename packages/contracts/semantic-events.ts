import { ContractValidationError } from "./errors.ts";
import { parseEventEnvelope } from "./event-envelope.ts";
import { parseLifecycleEvent } from "./event-validation.ts";
import type { EventMetadata, LifecycleEvent } from "./events.ts";
import { parseObservationSummary } from "./observation-summary.ts";
import type { ObservationSummary } from "./observation-summary.ts";
import { record } from "./validation.ts";
import { parseInvestigationEvent } from "./investigation-events.ts";
import type { InvestigationEvent } from "./investigation-events.ts";

export type ObservationCreatedEvent = Readonly<EventMetadata & {
  type: "observation.created";
  schemaVersion: 1;
  payload: Readonly<{ observation: ObservationSummary }>;
}>;

export type SemanticEvent = LifecycleEvent | ObservationCreatedEvent | InvestigationEvent;
export type SemanticEventType = SemanticEvent["type"];

export function parseSemanticEvent(value: unknown): SemanticEvent {
  const { input, base } = parseEventEnvelope(value);
  if (input.type === "investigation.requested" || input.type === "investigation.assigned" || input.type === "investigation.completed") {
    return parseInvestigationEvent(value);
  }
  if (input.type !== "observation.created") return parseLifecycleEvent(value);

  const payload = record(input.payload, "event.payload", ["observation"]);
  const observation = parseObservationSummary(payload.observation);
  if (observation.simulationId !== base.simulationId) {
    throw new ContractValidationError("event.payload.observation.simulationId", "Simulation ID does not match the envelope.");
  }
  // A system may record an agent's observation. An agent-originated event must
  // attribute it to that same agent; this checks consistency, not authenticity.
  if (base.origin.kind === "agent" && base.origin.agentId !== observation.agentId) {
    throw new ContractValidationError("event.payload.observation.agentId", "Author does not match the originating agent.");
  }
  return Object.freeze({ ...base, type: "observation.created", payload: Object.freeze({ observation }) });
}

export function createSemanticEvent(input: SemanticEvent): SemanticEvent {
  return parseSemanticEvent(input);
}

export function serializeSemanticEvent(event: SemanticEvent): string {
  return JSON.stringify(parseSemanticEvent(event));
}

export function deserializeSemanticEvent(json: string): SemanticEvent {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new ContractValidationError("event", "Invalid JSON.");
  }
  return parseSemanticEvent(input);
}
