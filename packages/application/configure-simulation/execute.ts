import { simulationId } from "../../domain/index.ts";
import { parseSimulationConfiguration, parseSimulationSetup } from "../../contracts/index.ts";
import { ApplicationError } from "../errors.ts";
import { configuredSimulation } from "./profiles.ts";
import type { ConfigureSimulationCommand, ConfigureSimulationDependencies } from "./ports.ts";

export async function executeConfigureSimulation(input: ConfigureSimulationCommand, dependencies: ConfigureSimulationDependencies) {
  const id = simulationId(input.simulationId);
  const setup = parseSimulationSetup(input.setup);
  const root = input.projectRoot;
  let project;
  try { project = await dependencies.projects.inspectProject(root); } catch (cause) {
    throw new ApplicationError("PROJECT_INSPECTION_FAILED", "Could not inspect the selected project.", { cause });
  }
  const configuration = parseSimulationConfiguration({ ...setup, simulationId: id, projectRoot: project.rootPath,
    name: setup.name ?? project.suggestedName });
  const simulation = configuredSimulation(configuration);
  let saved;
  try { saved = await dependencies.configurations.createConfiguredSimulation(configuration, simulation); } catch (cause) {
    throw new ApplicationError("SAVE_FAILED", "Simulation configuration commit failed; its outcome may be unknown.", { cause });
  }
  if (saved === "already-exists") throw new ApplicationError("SIMULATION_ALREADY_EXISTS", "A simulation with this identity already exists.");
  return Object.freeze({ configuration, simulation });
}
