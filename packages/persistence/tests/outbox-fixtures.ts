import { agentId, assignInvestigation } from "../../domain/index.ts";
import { parseInvestigationEvent } from "../../contracts/index.ts";
import type { DispatchOptions } from "../../application/index.ts";
import { fixture } from "./fixtures.ts";

export function requestEvent(source = fixture(), eventId = "requested-one") {
  const event = parseInvestigationEvent({ eventId, type: "investigation.requested", schemaVersion: 1,
    simulationId: source.simulation.id, occurredAt: source.investigation.requestedAt,
    origin: { kind: "agent", agentId: source.investigation.requestedBy }, correlationId: "original-correlation",
    payload: { investigation: source.investigation } });
  if (event.type !== "investigation.requested") throw new Error("Unexpected event.");
  return event;
}

export function assignmentEvent(source = fixture(), eventId = "assigned-one") {
  const investigation = assignInvestigation(source.investigation, [agentId("beginner")], "2026-10-30T12:01:00.000Z");
  const event = parseInvestigationEvent({ eventId, type: "investigation.assigned", schemaVersion: 1,
    simulationId: source.simulation.id, occurredAt: investigation.lifecycle.assignedAt,
    origin: { kind: "system" }, correlationId: "original-correlation", payload: { investigation } });
  if (event.type !== "investigation.assigned") throw new Error("Unexpected event.");
  return event;
}

export const dispatchOptions: DispatchOptions = { leaseMs: 100, batchSize: 10, maxAttempts: 3,
  retryBaseMs: 10, retryMaxMs: 30, deferMs: 5 };
export const claim = (now = 0) => ({ now, leaseMs: 100, limit: 10, maxAttempts: 3, token: "worker" });
