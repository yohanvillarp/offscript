import { eq } from "drizzle-orm";
import type { Observation } from "../../domain/index.ts";
import { parseObservationSummary } from "../../contracts/index.ts";
import type { ObservationReader } from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { observations } from "../schema/index.ts";
import { json, stored } from "../codecs/values.ts";

export interface ObservationRepository extends ObservationReader {
  createObservation(observation: Observation): Promise<"created" | "already-exists">;
}

export function observationRepository(db: PersistenceDatabase): ObservationRepository {
  return {
    async createObservation(input) {
      const observation = parseObservationSummary(input);
      const result = db.insert(observations).values({
        id: observation.id, simulationId: observation.simulationId, agentId: observation.agentId,
        observedAt: observation.observedAt, description: observation.description, location: observation.context.location,
        evidenceIds: JSON.stringify(observation.evidenceIds),
      }).onConflictDoNothing({ target: observations.id }).run();
      return result.changes ? "created" : "already-exists";
    },
    async findObservation(id) {
      const row = db.select().from(observations).where(eq(observations.id, id)).get();
      if (!row) return undefined;
      return stored(() => parseObservationSummary({
        id: row.id, simulationId: row.simulationId, agentId: row.agentId, observedAt: row.observedAt,
        description: row.description, context: { location: row.location }, evidenceIds: json(row.evidenceIds),
      }));
    },
  };
}
