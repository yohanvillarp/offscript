import type { AgentId } from "../../domain/index.ts";
import type { RequestInvestigationCommand, RequestInvestigationResult } from "../index.ts";

export function checkTypes(command: RequestInvestigationCommand, result: RequestInvestigationResult): void {
  // @ts-expect-error Observation IDs cannot be replaced with agent IDs.
  const agent: AgentId = command.observationIds[0]!;
  void agent;
  // @ts-expect-error Command reference lists are immutable.
  command.observationIds.push("observation-2");
  const type: "investigation.requested" = result.event.type;
  void type;
  // @ts-expect-error A requested event has no completed result.
  void result.event.payload.investigation.lifecycle.result;
  if (result.publication.status === "queued") {
    // @ts-expect-error Queued results do not expose publisher errors.
    void result.publication.cause;
  }
}
