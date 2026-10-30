import { ContractValidationError } from "./errors.ts";
import type { AgentEventPayload, EventMetadata, EventOrigin, LifecycleEvent, SimulationEventPayload } from "./events.ts";
import { parseAgentSummary, parseSimulationSummary } from "./summaries.ts";
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

function simulationPayload<S extends "running" | "completed" | "failed" | "cancelled">(
  value: unknown, status: S, simulationId: EventMetadata["simulationId"],
): SimulationEventPayload<S> {
  const input = record(value, "event.payload", ["simulation"]);
  const simulation = parseSimulationSummary(input.simulation);
  if (simulation.lifecycle.status !== status || simulation.id !== simulationId) {
    throw new ContractValidationError("event.payload.simulation", "Lifecycle or simulation ID does not match the envelope.");
  }
  // The equality checks above narrow both the subject and its event-specific status.
  return Object.freeze({ simulation }) as SimulationEventPayload<S>;
}

function agentPayload<S extends "running" | "completed" | "failed" | "cancelled">(
  value: unknown, status: S, simulationId: EventMetadata["simulationId"],
): AgentEventPayload<S> {
  const input = record(value, "event.payload", ["agent"]);
  const agent = parseAgentSummary(input.agent);
  if (agent.lifecycle.status !== status || agent.simulationId !== simulationId) {
    throw new ContractValidationError("event.payload.agent", "Lifecycle or simulation ID does not match the envelope.");
  }
  return Object.freeze({ agent }) as AgentEventPayload<S>;
}

export function parseLifecycleEvent(value: unknown): LifecycleEvent {
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
  const base = { ...metadata, schemaVersion: 1 as const };
  switch (input.type) {
    case "simulation.started":
      return Object.freeze({ ...base, type: input.type, payload: simulationPayload(input.payload, "running", base.simulationId) });
    case "simulation.completed":
      return Object.freeze({ ...base, type: input.type, payload: simulationPayload(input.payload, "completed", base.simulationId) });
    case "simulation.failed":
      return Object.freeze({ ...base, type: input.type, payload: simulationPayload(input.payload, "failed", base.simulationId) });
    case "simulation.cancelled":
      return Object.freeze({ ...base, type: input.type, payload: simulationPayload(input.payload, "cancelled", base.simulationId) });
    case "agent.started":
      return Object.freeze({ ...base, type: input.type, payload: agentPayload(input.payload, "running", base.simulationId) });
    case "agent.completed":
      return Object.freeze({ ...base, type: input.type, payload: agentPayload(input.payload, "completed", base.simulationId) });
    case "agent.failed":
      return Object.freeze({ ...base, type: input.type, payload: agentPayload(input.payload, "failed", base.simulationId) });
    case "agent.cancelled":
      return Object.freeze({ ...base, type: input.type, payload: agentPayload(input.payload, "cancelled", base.simulationId) });
    default:
      throw new ContractValidationError("event.type", "Unknown lifecycle event type.");
  }
}
