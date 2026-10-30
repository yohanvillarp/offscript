import { agentId, investigationId, observationId, requestInvestigation, simulationId } from "../../domain/index.ts";
import { parseInvestigationEvent } from "../../contracts/index.ts";
import { ApplicationError } from "../errors.ts";
import { resolveContext } from "./resolve-context.ts";
import type {
  RequestInvestigationCommand, RequestInvestigationDependencies, RequestInvestigationResult,
} from "./ports.ts";

export async function executeRequestInvestigation(
  input: RequestInvestigationCommand, dependencies: RequestInvestigationDependencies,
): Promise<RequestInvestigationResult> {
  // Snapshot caller-owned data before awaiting adapters.
  const command = Object.freeze({
    ...input, investigationId: investigationId(input.investigationId), simulationId: simulationId(input.simulationId),
    requestedBy: agentId(input.requestedBy), observationIds: Object.freeze(input.observationIds.map(observationId)),
  });
  const observations = await resolveContext(command, dependencies);
  const investigation = requestInvestigation({
    id: command.investigationId, simulationId: command.simulationId, requestedBy: command.requestedBy,
    hypothesis: command.hypothesis, requestedAt: command.requestedAt,
  }, observations);
  const event = parseInvestigationEvent({
    eventId: command.eventId, type: "investigation.requested", schemaVersion: 1,
    occurredAt: command.requestedAt, simulationId: command.simulationId,
    origin: { kind: "agent", agentId: command.requestedBy }, correlationId: command.correlationId,
    payload: { investigation },
  });
  if (event.type !== "investigation.requested") {
    throw new ApplicationError("INVALID_REFERENCE", "Unexpected event type returned by the contract parser.");
  }
  let saved: "created" | "already-exists";
  try {
    saved = await dependencies.investigations.createInvestigation(investigation);
  } catch (cause) {
    throw new ApplicationError("SAVE_FAILED", "Investigation save failed; its commit outcome may be unknown.", { cause });
  }
  if (saved === "already-exists") {
    throw new ApplicationError("INVESTIGATION_ALREADY_EXISTS", "An investigation with this identity already exists.");
  }
  try {
    await dependencies.events.publishInvestigationRequested(event);
  } catch (cause) {
    return Object.freeze({ investigation, event, publication: Object.freeze({ status: "unconfirmed" as const, cause }) });
  }
  return Object.freeze({ investigation, event, publication: Object.freeze({ status: "published" }) });
}
