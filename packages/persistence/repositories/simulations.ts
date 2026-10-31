import { asc, eq } from "drizzle-orm";
import type { Simulation, SimulationId } from "../../domain/index.ts";
import type { SimulationReader } from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { agents, simulations } from "../schema/index.ts";
import { restoreSimulation } from "../codecs/simulation.ts";
import { writeSimulation } from "./simulation-writes.ts";

export interface SimulationRepository extends SimulationReader {
  createSimulation(simulation: Simulation): Promise<"created" | "already-exists">;
}

export function simulationRepository(db: PersistenceDatabase): SimulationRepository {
  return {
    async createSimulation(simulation) {
      return db.transaction(tx => writeSimulation(tx, simulation), { behavior: "immediate" });
    },
    async findSimulation(id: SimulationId) {
      return db.transaction((tx) => {
        const row = tx.select().from(simulations).where(eq(simulations.id, id)).get();
        if (!row) return undefined;
        const members = tx.select().from(agents).where(eq(agents.simulationId, id)).orderBy(asc(agents.position)).all();
        return restoreSimulation(row, members);
      });
    },
  };
}
