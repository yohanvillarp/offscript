import { eq } from "drizzle-orm";
import type { SimulationId } from "../../domain/index.ts";
import type { DeleteConfiguredSimulationResult } from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import {
  agents,
  simulations,
  simulationConfigurations,
  observations,
  investigations,
  investigationObservations,
  investigationAgents,
  outbox,
} from "../schema/index.ts";

export function deleteConfiguration(db: PersistenceDatabase, id: SimulationId): DeleteConfiguredSimulationResult {
  return db.transaction(tx => {
    if (!tx.select({ id: simulationConfigurations.simulationId }).from(simulationConfigurations).where(eq(simulationConfigurations.simulationId, id)).get()) return "not-found";
    const simulation = tx.select().from(simulations).where(eq(simulations.id, id)).get();
    if (!simulation || simulation.status === "running") return "not-allowed";
    const members = tx.select({ status: agents.status }).from(agents).where(eq(agents.simulationId, id)).all();
    if (members.some(member => member.status === "running")) return "not-allowed";

    tx.delete(investigationObservations).where(eq(investigationObservations.simulationId, id)).run();
    tx.delete(investigationAgents).where(eq(investigationAgents.simulationId, id)).run();
    tx.delete(outbox).where(eq(outbox.simulationId, id)).run();
    tx.delete(investigations).where(eq(investigations.simulationId, id)).run();
    tx.delete(observations).where(eq(observations.simulationId, id)).run();
    tx.delete(simulationConfigurations).where(eq(simulationConfigurations.simulationId, id)).run();
    tx.delete(agents).where(eq(agents.simulationId, id)).run();
    tx.delete(simulations).where(eq(simulations.id, id)).run();
    return "deleted";
  }, { behavior: "immediate" });
}
