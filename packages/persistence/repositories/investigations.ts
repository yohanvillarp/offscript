import type { InvestigationAssignmentStore, InvestigationWriter } from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { readInvestigation } from "../codecs/investigation.ts";
import { writeRequest, writeAssignment } from "./investigation-writes.ts";

export function investigationRepository(db: PersistenceDatabase): InvestigationWriter & InvestigationAssignmentStore {
  return {
    async createInvestigation(input) { return db.transaction(tx => writeRequest(tx, input), { behavior: "immediate" }); },
    async findInvestigation(id) { return db.transaction(tx => readInvestigation(tx, id)); },
    async saveAssignment(input, revision) { return db.transaction(tx => writeAssignment(tx, input, revision), { behavior: "immediate" }); },
  };
}
