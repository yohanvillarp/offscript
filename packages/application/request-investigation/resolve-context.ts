import type { Observation, Simulation } from "../../domain/index.ts";
import { ApplicationError } from "../errors.ts";
import type { RequestInvestigationCommand, RequestInvestigationDependencies } from "./ports.ts";

async function read<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    throw new ApplicationError("READ_FAILED", "Could not read investigation context.", { cause });
  }
}

export async function resolveContext(
  command: RequestInvestigationCommand, dependencies: RequestInvestigationDependencies,
): Promise<readonly Observation[]> {
  const simulation = await read(() => dependencies.simulations.findSimulation(command.simulationId));
  if (!simulation) throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation does not exist.");
  validateSimulation(simulation, command);
  const observations: Observation[] = [];
  for (const id of command.observationIds) {
    const observation = await read(() => dependencies.observations.findObservation(id));
    if (!observation) throw new ApplicationError("OBSERVATION_NOT_FOUND", `Observation does not exist: ${id}`);
    if (observation.id !== id || observation.simulationId !== simulation.id ||
        !simulation.agents.some((agent) => agent.id === observation.agentId)) {
      throw new ApplicationError("INVALID_REFERENCE", "Observation identity, simulation, or author is inconsistent.");
    }
    observations.push(observation);
  }
  return observations;
}

function validateSimulation(simulation: Simulation, command: RequestInvestigationCommand): void {
  if (simulation.id !== command.simulationId) {
    throw new ApplicationError("INVALID_REFERENCE", "Simulation reader returned a different identity.");
  }
  if (simulation.lifecycle.status !== "running") {
    throw new ApplicationError("SIMULATION_NOT_RUNNING", "Investigation requests require a running simulation.");
  }
  const requester = simulation.agents.find((agent) => agent.id === command.requestedBy);
  if (!requester) throw new ApplicationError("REQUESTER_NOT_FOUND", "Requesting agent is not a simulation member.");
  if (requester.lifecycle.status !== "running") {
    throw new ApplicationError("REQUESTER_NOT_RUNNING", "Requesting agent must have active participation.");
  }
}
