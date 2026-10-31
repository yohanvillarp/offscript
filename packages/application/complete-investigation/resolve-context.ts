import type { AgentId, Simulation } from "../../domain/index.ts";
import { ApplicationError } from "../errors.ts";
import type {
  CompleteInvestigationCommand,
  CompleteInvestigationDependencies,
} from "./ports.ts";
import type { VersionedInvestigation } from "../assign-investigation/ports.ts";

async function read<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    throw new ApplicationError("READ_FAILED", "Could not read completion context.", { cause });
  }
}

function activeAgent(simulation: Simulation, id: AgentId): void {
  const agent = simulation.agents.find((entry) => entry.id === id);
  if (!agent) {
    throw new ApplicationError("COMPLETER_NOT_FOUND", "Completion agent is not a simulation member.");
  }
  if (agent.lifecycle.status !== "running") {
    throw new ApplicationError("COMPLETER_NOT_RUNNING", "Completion agent must have active participation.");
  }
}

export async function resolveCompletionContext(
  command: CompleteInvestigationCommand,
  dependencies: CompleteInvestigationDependencies,
): Promise<VersionedInvestigation> {
  const record = await read(() => dependencies.investigations.findInvestigation(command.investigationId));
  if (!record) {
    throw new ApplicationError("INVESTIGATION_NOT_FOUND", "Investigation does not exist.");
  }
  if (
    record.investigation.id !== command.investigationId ||
    record.investigation.simulationId !== command.simulationId
  ) {
    throw new ApplicationError("INVALID_REFERENCE", "Investigation identity or simulation does not match the command.");
  }
  if (
    !Number.isSafeInteger(record.revision) ||
    record.revision < 0 ||
    record.revision === Number.MAX_SAFE_INTEGER
  ) {
    throw new ApplicationError("INVALID_REFERENCE", "Investigation storage revision is invalid or exhausted.");
  }
  const simulation = await read(() => dependencies.simulations.findSimulation(command.simulationId));
  if (!simulation) {
    throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation does not exist.");
  }
  if (simulation.id !== command.simulationId) {
    throw new ApplicationError("INVALID_REFERENCE", "Simulation identity does not match the command.");
  }
  if (simulation.lifecycle.status !== "running") {
    throw new ApplicationError("SIMULATION_NOT_RUNNING", "Completion requires a running simulation.");
  }
  activeAgent(simulation, command.completedBy);
  if (command.origin.kind === "agent") {
    activeAgent(simulation, command.origin.agentId);
  }
  return record;
}
