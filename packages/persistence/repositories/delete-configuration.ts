import { eq } from "drizzle-orm";
import type { SimulationId } from "../../domain/index.ts";
import type { DeleteConfiguredSimulationResult } from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { agents, simulations, simulationConfigurations, observations, investigations, outbox } from "../schema/index.ts";

export function deleteConfiguration(db: PersistenceDatabase, id: SimulationId): DeleteConfiguredSimulationResult {
  return db.transaction(tx => {
    if (!tx.select({ id: simulationConfigurations.simulationId }).from(simulationConfigurations).where(eq(simulationConfigurations.simulationId, id)).get()) return "not-found";
    const simulation = tx.select().from(simulations).where(eq(simulations.id, id)).get();
    const members = tx.select({ status: agents.status }).from(agents).where(eq(agents.simulationId, id)).all();
    if (simulation?.status !== "created" || members.some(member => member.status !== "ready")) return "not-allowed";
    if (tx.select({ id: observations.id }).from(observations).where(eq(observations.simulationId, id)).limit(1).get() ||
        tx.select({ id: investigations.id }).from(investigations).where(eq(investigations.simulationId, id)).limit(1).get() ||
        tx.select({ id: outbox.eventId }).from(outbox).where(eq(outbox.simulationId, id)).limit(1).get()) return "not-allowed";
    tx.delete(simulationConfigurations).where(eq(simulationConfigurations.simulationId, id)).run();
    tx.delete(agents).where(eq(agents.simulationId, id)).run();
    tx.delete(simulations).where(eq(simulations.id, id)).run();
    return "deleted";
  }, { behavior: "immediate" });
}
