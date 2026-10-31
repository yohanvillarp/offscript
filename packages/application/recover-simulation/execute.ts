import { simulationId, transitionSimulation } from "../../domain/index.ts";
import { ApplicationError } from "../errors.ts";
import type {
  RecoverSimulationCommand,
  RecoverSimulationResult,
  SimulationRecoveryStore,
} from "./ports.ts";

export async function executeRecoverSimulation(
  command: RecoverSimulationCommand,
  store: SimulationRecoveryStore,
): Promise<RecoverSimulationResult> {
  simulationId(command.simulationId);
  const sim = await store.findSimulation(command.simulationId);
  if (!sim) {
    throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation not found.");
  }
  if (sim.lifecycle.status !== "running") {
    throw new ApplicationError(
      "INVALID_EXECUTION_STATE",
      `Only running simulations can be recovered; current status is ${sim.lifecycle.status}.`,
    );
  }

  const action = command.action ?? "fail";
  const reason = (command.reason && command.reason.trim())
    ? command.reason
    : "INTERRUPTED_BY_HOST_RESTART";

  const nextSim = action === "cancel"
    ? transitionSimulation(sim, { status: "cancelled" })
    : transitionSimulation(sim, { status: "failed", reason });

  const commit = await store.updateSimulationAggregate(nextSim, { status: "running" });
  if (commit === "conflict") {
    throw new ApplicationError("EXECUTION_ALREADY_ACTIVE", "Simulation state changed concurrently.");
  }
  if (commit === "not-found") {
    throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation not found.");
  }

  return Object.freeze({
    simulation: nextSim,
    action,
    recoveredAt: new Date().toISOString(),
  });
}
