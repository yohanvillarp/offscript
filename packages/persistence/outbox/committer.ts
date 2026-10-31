import { eq } from "drizzle-orm";
import { parseInvestigationEvent, serializeSemanticEvent } from "../../contracts/index.ts";
import type {
  InvestigationRequestCommitter,
  InvestigationAssignmentCommitter,
  InvestigationCompletionCommitter,
} from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { outbox as eventOutbox } from "../schema/index.ts";
import { readInvestigation } from "../codecs/investigation.ts";
import { writeRequest, writeAssignment, writeCompletion } from "../repositories/investigation-writes.ts";

export function investigationCommitter(
  db: PersistenceDatabase,
): InvestigationRequestCommitter & InvestigationAssignmentCommitter & InvestigationCompletionCommitter {
  function commit(
    input:
      | Parameters<InvestigationRequestCommitter["commitRequest"]>[0]
      | Parameters<InvestigationAssignmentCommitter["commitAssignment"]>[0]
      | Parameters<InvestigationCompletionCommitter["commitCompletion"]>[0],
    expected?: number,
  ) {
    if (expected !== undefined && (!Number.isSafeInteger(expected) || expected < 0 || expected >= Number.MAX_SAFE_INTEGER)) throw new Error("Invalid revision.");
    const event = parseInvestigationEvent(input);
    const eventJson = serializeSemanticEvent(event);
    const revision = expected === undefined ? 0 : expected + 1;
    return db.transaction(tx => {
      const previous = tx.select().from(eventOutbox).where(eq(eventOutbox.eventId, event.eventId)).get();
      if (previous) return previous.eventJson === eventJson && previous.revision === revision ? "duplicate" : "event-conflict";
      let result: "created" | "already-exists" | "saved" | "conflict" | "not-found";
      if (event.type === "investigation.requested" && expected === undefined) result = writeRequest(tx, event.payload.investigation);
      else if (event.type === "investigation.assigned" && expected !== undefined) result = writeAssignment(tx, event.payload.investigation, expected);
      else if (event.type === "investigation.completed" && expected !== undefined) result = writeCompletion(tx, event.payload.investigation, expected);
      else throw new Error("Invalid investigation commit type.");
      if (result !== "created" && result !== "saved") return result;
      tx.insert(eventOutbox).values({ eventId: event.eventId, eventJson, simulationId: event.simulationId,
        investigationId: event.payload.investigation.id, revision }).run();
      return result;
    }, { behavior: "immediate" });
  }
  return {
    async findInvestigation(id) { return db.transaction(tx => readInvestigation(tx, id)); },
    async commitRequest(event) {
      const result = commit(event);
      if (result === "saved" || result === "not-found" || result === "conflict") throw new Error("Invalid request commit result.");
      return result;
    },
    async commitAssignment(event, revision) {
      const result = commit(event, revision);
      if (result === "created" || result === "already-exists") throw new Error("Invalid assignment commit result.");
      return result;
    },
    async commitCompletion(event, revision) {
      const result = commit(event, revision);
      if (result === "created" || result === "already-exists") throw new Error("Invalid completion commit result.");
      return result;
    },
  };
}
