import { ContractValidationError } from "./errors.ts";
import type { EventMetadata, EventOrigin } from "./events.ts";
import { readAgentId, readSimulationId, record, text, timestamp } from "./validation.ts";

function origin(value: unknown): EventOrigin {
  const input = record(value, "event.origin", ["kind", "agentId"]);
  if (input.kind === "agent") {
    return Object.freeze({ kind: "agent", agentId: readAgentId(input.agentId, "event.origin.agentId") });
  }
  if (input.kind !== "system" || Object.hasOwn(input, "agentId")) {
    throw new ContractValidationError("event.origin", "Expected a system origin or an agent origin with an ID.");
  }
  return Object.freeze({ kind: "system" });
}

export function parseEventEnvelope(value: unknown) {
  const input = record(value, "event", [
    "eventId", "type", "schemaVersion", "occurredAt", "simulationId", "origin", "correlationId", "payload",
  ]);
  if (input.schemaVersion !== 1) {
    throw new ContractValidationError("event.schemaVersion", "Only schema version 1 is supported.");
  }
  const metadata: EventMetadata = {
    eventId: text(input.eventId, "event.eventId"),
    occurredAt: timestamp(input.occurredAt, "event.occurredAt"),
    simulationId: readSimulationId(input.simulationId, "event.simulationId"),
    origin: origin(input.origin),
    correlationId: text(input.correlationId, "event.correlationId"),
  };
  return { input, base: { ...metadata, schemaVersion: 1 as const } };
}
