import { agentId, assignInvestigation, investigationId, simulationId } from "../../domain/index.ts";
import { parseInvestigationEvent } from "../../contracts/index.ts";
import { ApplicationError } from "../errors.ts";
import { resolveAssignmentContext } from "./resolve-context.ts";
import type { AssignInvestigationCommand, AssignInvestigationDependencies, AssignInvestigationResult } from "./ports.ts";

export async function executeAssignInvestigation(
  input: AssignInvestigationCommand, dependencies: AssignInvestigationDependencies,
): Promise<AssignInvestigationResult> {
  const command = Object.freeze({
    ...input, investigationId: investigationId(input.investigationId), simulationId: simulationId(input.simulationId),
    agentIds: Object.freeze(input.agentIds.map(agentId)), origin: Object.freeze({ ...input.origin }),
  });
  const record = await resolveAssignmentContext(command, dependencies);
  const investigation = assignInvestigation(record.investigation, command.agentIds, command.assignedAt);
  const event = parseInvestigationEvent({
    eventId: command.eventId, type: "investigation.assigned", schemaVersion: 1,
    occurredAt: command.assignedAt, simulationId: command.simulationId, origin: command.origin,
    correlationId: command.correlationId, payload: { investigation },
  });
  if (event.type !== "investigation.assigned") throw new ApplicationError("INVALID_REFERENCE", "Unexpected assignment event type.");
  let saved: "saved" | "duplicate" | "conflict" | "not-found" | "event-conflict";
  try {
    saved = await dependencies.investigations.commitAssignment(event, record.revision);
  } catch (cause) {
    throw new ApplicationError("SAVE_FAILED", "Assignment save failed; its commit outcome may be unknown.", { cause });
  }
  if (saved === "not-found") throw new ApplicationError("INVESTIGATION_NOT_FOUND", "Investigation disappeared before saving.");
  if (saved === "conflict") throw new ApplicationError("INVESTIGATION_CONFLICT", "Investigation changed before saving; reload before deciding to retry.");
  const revision = record.revision + 1;
  if (saved === "event-conflict") throw new ApplicationError("EVENT_ID_CONFLICT", "Event identity already has different content.");
  return Object.freeze({ investigation, event, revision, publication: Object.freeze({ status: saved === "duplicate" ? "already-recorded" as const : "queued" as const }) });
}
