import { asc, eq } from "drizzle-orm";
import type { InvestigationAssignmentStore, InvestigationWriter } from "../../application/index.ts";
import type { InvestigationSummary } from "../../contracts/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { readInvestigation } from "../codecs/investigation.ts";
import { writeRequest, writeAssignment } from "./investigation-writes.ts";
import { investigations } from "../schema/index.ts";
import { PersistenceError } from "../errors.ts";

export type InvestigationRepository = InvestigationWriter & InvestigationAssignmentStore & Readonly<{
  listInvestigations(simulationId: string): Promise<readonly InvestigationSummary[]>;
}>;

export function investigationRepository(db: PersistenceDatabase): InvestigationRepository {
  return {
    async createInvestigation(input) { return db.transaction(tx => writeRequest(tx, input), { behavior: "immediate" }); },
    async findInvestigation(id) { return db.transaction(tx => readInvestigation(tx, id)); },
    async saveAssignment(input, revision) { return db.transaction(tx => writeAssignment(tx, input, revision), { behavior: "immediate" }); },
    async listInvestigations(simulationId) {
      return db.transaction(tx => {
        const rows = tx.select({ id: investigations.id })
          .from(investigations)
          .where(eq(investigations.simulationId, simulationId))
          .orderBy(asc(investigations.requestedAt))
          .all();
        return Object.freeze(rows.map(row => {
          const loaded = readInvestigation(tx, row.id);
          if (!loaded) throw new PersistenceError("INVALID_STORED_DATA", "Investigation missing during list.");
          return loaded.investigation;
        }));
      });
    },
  };
}
