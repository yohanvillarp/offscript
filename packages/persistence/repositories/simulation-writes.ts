import type { Simulation } from "../../domain/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { agents, simulations } from "../schema/index.ts";
import { simulationRows } from "../codecs/simulation.ts";

export function writeSimulation(tx: Pick<PersistenceDatabase, "insert">, simulation: Simulation): "created" | "already-exists" {
  const { row, members } = simulationRows(simulation);
  const created = tx.insert(simulations).values(row).onConflictDoNothing({ target: simulations.id }).run();
  if (!created.changes) return "already-exists";
  if (members.length) tx.insert(agents).values(members).run();
  return "created";
}
