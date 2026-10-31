import { openConnection } from "./connection.ts";
import type { PersistenceOptions } from "./connection.ts";
import { migrateDatabase } from "./migrate.ts";
import { simulationRepository } from "./repositories/simulations.ts";
import { observationRepository } from "./repositories/observations.ts";
import { investigationRepository } from "./repositories/investigations.ts";
import { investigationCommitter } from "./outbox/committer.ts";
import { outboxStore } from "./outbox/store.ts";
import { configurationRepository } from "./repositories/configurations.ts";

export function openPersistence(options: PersistenceOptions) {
  const connection = openConnection(options);
  return Object.freeze({
    databasePath: connection.databasePath,
    migrate() { migrateDatabase(connection.db); },
    simulations: simulationRepository(connection.db), observations: observationRepository(connection.db),
    investigations: Object.freeze({ ...investigationRepository(connection.db), ...investigationCommitter(connection.db) }),
    outbox: outboxStore(connection.db),
    configurations: configurationRepository(connection.db),
    close() { if (connection.client.open) connection.client.close(); },
  });
}

export type { PersistenceOptions } from "./connection.ts";
export type { SimulationRepository } from "./repositories/simulations.ts";
export type { ExpectedSimulationAggregate } from "./repositories/simulation-writes.ts";
export type { ObservationRepository } from "./repositories/observations.ts";
export { PersistenceError } from "./errors.ts";
export type { PersistenceErrorCode } from "./errors.ts";
