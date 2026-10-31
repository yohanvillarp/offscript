import { simulationId } from "../domain/index.ts";
import type { SimulationId } from "../domain/index.ts";
import { ApplicationError } from "./errors.ts";

export type DeleteConfiguredSimulationResult = "deleted" | "not-found" | "not-allowed";
export interface ConfiguredSimulationDeletion {
  /** Check eligibility and remove configuration, roster, and snapshot atomically. */
  deleteConfiguredSimulation(id: SimulationId): Promise<DeleteConfiguredSimulationResult>;
}

export async function executeDeleteConfiguredSimulation(id: SimulationId, store: ConfiguredSimulationDeletion): Promise<DeleteConfiguredSimulationResult> {
  simulationId(id);
  try { return await store.deleteConfiguredSimulation(id); }
  catch (cause) { throw new ApplicationError("DELETE_FAILED", "Could not delete the saved simulation.", { cause }); }
}
