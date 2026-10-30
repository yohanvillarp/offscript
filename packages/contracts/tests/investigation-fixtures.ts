import {
  agentId, assignInvestigation, completeInvestigation, createObservation, evidenceId,
  investigationId, observationId, requestInvestigation, simulationId,
} from "../../domain/index.ts";
import type { InvestigationEvent } from "../index.ts";

export const investigationTypes = ["investigation.requested", "investigation.assigned", "investigation.completed"] as const;

export function investigationEvent(type: InvestigationEvent["type"] = "investigation.requested"): InvestigationEvent {
  const simulation = simulationId("simulation-1");
  const author = agentId("beginner");
  const time = "2026-10-30T12:00:00.000Z";
  const requested = requestInvestigation({
    id: investigationId("investigation-1"), simulationId: simulation, requestedBy: author,
    hypothesis: "Cart state may disappear after reload.", requestedAt: time,
  }, [createObservation({
    id: observationId("observation-1"), simulationId: simulation, agentId: author,
    observedAt: time, description: "Item vanished.", context: { location: "/cart" }, evidenceIds: [],
  })]);
  const metadata = {
    eventId: "event-1", schemaVersion: 1 as const, simulationId: simulation,
    origin: { kind: "system" as const }, correlationId: "correlation-1", occurredAt: time,
  };
  if (type === "investigation.requested") return { ...metadata, type, payload: { investigation: requested } };
  const assigned = assignInvestigation(requested, [author, agentId("explorer")], time);
  if (type === "investigation.assigned") return { ...metadata, type, payload: { investigation: assigned } };
  const completed = completeInvestigation(assigned, {
    outcome: "supported", explanation: "The capture records the missing item.", evidenceIds: [evidenceId("capture-1")],
  }, author, time);
  return { ...metadata, type, payload: { investigation: completed } };
}
