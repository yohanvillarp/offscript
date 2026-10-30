import type { AssignInvestigationCommand, AssignInvestigationResult, VersionedInvestigation } from "../index.ts";

export function checkAssignmentTypes(command: AssignInvestigationCommand, result: AssignInvestigationResult, stored: VersionedInvestigation): void {
  const eventType: "investigation.assigned" = result.event.type;
  void eventType;
  // @ts-expect-error Assignment commands cannot mutate their source collections.
  command.agentIds.push("outsider");
  // @ts-expect-error Storage revisions are readonly and are not domain fields.
  stored.revision = 4;
  // @ts-expect-error The assignment does not contain a completion result.
  void result.investigation.lifecycle.result;
  if (result.publication.status === "published") {
    // @ts-expect-error Only unconfirmed delivery carries a cause.
    void result.publication.cause;
  }
}
