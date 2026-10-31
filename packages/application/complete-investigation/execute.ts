import {
  agentId,
  completeInvestigation,
  createInvestigationResult,
  investigationId,
  simulationId,
} from "../../domain/index.ts";
import { parseInvestigationEvent } from "../../contracts/index.ts";
import { ApplicationError } from "../errors.ts";
import { resolveCompletionContext } from "./resolve-context.ts";
import type {
  CompleteInvestigationCommand,
  CompleteInvestigationDependencies,
  CompleteInvestigationResult,
} from "./ports.ts";

export async function executeCompleteInvestigation(
  input: CompleteInvestigationCommand,
  dependencies: CompleteInvestigationDependencies,
): Promise<CompleteInvestigationResult> {
  const command = Object.freeze({
    ...input,
    investigationId: investigationId(input.investigationId),
    simulationId: simulationId(input.simulationId),
    completedBy: agentId(input.completedBy),
    result: createInvestigationResult(input.result),
    origin: Object.freeze({ ...input.origin }),
  });
  const record = await resolveCompletionContext(command, dependencies);
  const investigation = completeInvestigation(
    record.investigation,
    command.result,
    command.completedBy,
    command.completedAt,
  );
  const event = parseInvestigationEvent({
    eventId: command.eventId,
    type: "investigation.completed",
    schemaVersion: 1,
    occurredAt: command.completedAt,
    simulationId: command.simulationId,
    origin: command.origin,
    correlationId: command.correlationId,
    payload: { investigation },
  });
  if (event.type !== "investigation.completed") {
    throw new ApplicationError("INVALID_REFERENCE", "Unexpected completion event type.");
  }
  let saved: "saved" | "duplicate" | "conflict" | "not-found" | "event-conflict";
  try {
    saved = await dependencies.investigations.commitCompletion(event, record.revision);
  } catch (cause) {
    throw new ApplicationError("SAVE_FAILED", "Completion save failed; its commit outcome may be unknown.", { cause });
  }
  if (saved === "not-found") {
    throw new ApplicationError("INVESTIGATION_NOT_FOUND", "Investigation disappeared before saving.");
  }
  if (saved === "conflict") {
    throw new ApplicationError("INVESTIGATION_CONFLICT", "Investigation changed before saving; reload before deciding to retry.");
  }
  if (saved === "event-conflict") {
    throw new ApplicationError("EVENT_ID_CONFLICT", "Event identity already has different content.");
  }
  const revision = record.revision + 1;
  return Object.freeze({
    investigation,
    event,
    revision,
    publication: Object.freeze({
      status: saved === "duplicate" ? ("already-recorded" as const) : ("queued" as const),
    }),
  });
}
