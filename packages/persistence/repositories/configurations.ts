import { eq, sql } from "drizzle-orm";
import { configuredSimulation } from "../../application/index.ts";
import type { SimulationConfigurationStore } from "../../application/index.ts";
import { parseSimulationConfiguration } from "../../contracts/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { simulationConfigurations } from "../schema/index.ts";
import { PersistenceError } from "../errors.ts";
import { json, stored } from "../codecs/values.ts";
import { writeSimulation } from "./simulation-writes.ts";

export function configurationRepository(db: PersistenceDatabase): SimulationConfigurationStore {
  return {
    async listConfigurations() {
      const rows = db.select().from(simulationConfigurations).orderBy(sql`rowid desc`).limit(50).all();
      return stored(() => Object.freeze(rows.map(row => parseSimulationConfiguration(json(row.configuration)))));
    },
    async createConfiguredSimulation(input, simulation) {
      const configuration = parseSimulationConfiguration(input);
      if (JSON.stringify(configuredSimulation(configuration)) !== JSON.stringify(simulation)) {
        throw new PersistenceError("INVALID_WRITE", "Configuration must match a created simulation with ready users.");
      }
      return db.transaction(tx => {
        const created = writeSimulation(tx, simulation);
        if (created !== "created") return created;
        tx.insert(simulationConfigurations).values({ simulationId: configuration.simulationId, configuration: JSON.stringify(configuration) }).run();
        return "created";
      }, { behavior: "immediate" });
    },
    async findConfiguration(id) {
      const row = db.select().from(simulationConfigurations).where(eq(simulationConfigurations.simulationId, id)).get();
      if (!row) return undefined;
      return stored(() => {
        const configuration = parseSimulationConfiguration(json(row.configuration));
        if (configuration.simulationId !== id) throw new PersistenceError("INVALID_STORED_DATA", "Configuration identity does not match its row.");
        return configuration;
      });
    },
  };
}
