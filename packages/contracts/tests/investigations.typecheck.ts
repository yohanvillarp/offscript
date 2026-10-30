import type { AgentId, InvestigationId } from "../../domain/index.ts";
import type { InvestigationPayloads, SemanticEvent } from "../index.ts";

export function narrowInvestigation(event: SemanticEvent): InvestigationId | undefined {
  if (event.type === "investigation.completed") {
    const author: AgentId = event.payload.investigation.lifecycle.completedBy;
    const explanation: string = event.payload.investigation.lifecycle.result.explanation;
    void author;
    void explanation;
    // @ts-expect-error Completed snapshots cannot be requested-event payloads.
    const wrong: InvestigationPayloads["investigation.requested"] = event.payload;
    void wrong;
    // @ts-expect-error Hypothesis outcomes do not assert a confirmed finding.
    const confirmed: "confirmed" = event.payload.investigation.lifecycle.result.outcome;
    void confirmed;
    // @ts-expect-error Collaborator IDs are readonly.
    event.payload.investigation.lifecycle.agentIds.push(author);
    return event.payload.investigation.id;
  }
  if (event.type === "investigation.requested") {
    // @ts-expect-error A requested investigation does not have a completion result.
    void event.payload.investigation.lifecycle.result;
    return event.payload.investigation.id;
  }
  return undefined;
}
