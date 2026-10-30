import { openConnection } from "./connection.ts";
import type { PersistenceOptions } from "./connection.ts";
import { migrateDatabase } from "./migrate.ts";
import { simulationRepository } from "./repositories/simulations.ts";
import { observationRepository } from "./repositories/observations.ts";
import { investigationRepository } from "./repositories/investigations.ts";

export function openPersistence(options: PersistenceOptions) {
  const connection = openConnection(options);
  return Object.freeze({
    databasePath: connection.databasePath,
    migrate() { migrateDatabase(connection.db); },
    simulations: simulationRepository(connection.db), observations: observationRepository(connection.db),
    investigations: investigationRepository(connection.db),
    close() { if (connection.client.open) connection.client.close(); },
  });
}

export type { PersistenceOptions } from "./connection.ts";
export type { SimulationRepository } from "./repositories/simulations.ts";
export type { ObservationRepository } from "./repositories/observations.ts";
export { PersistenceError } from "./errors.ts";
export type { PersistenceErrorCode } from "./errors.ts";
