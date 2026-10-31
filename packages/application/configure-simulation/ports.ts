import type { Simulation, SimulationId } from "../../domain/index.ts";
import type { ProjectDescriptor, SimulationConfiguration, SimulationSetup } from "../../contracts/index.ts";

export interface ProjectInspector {
  inspectProject(projectRoot: string): Promise<ProjectDescriptor>;
}
export interface SimulationConfigurationStore {
  // Both the configuration and the initial domain snapshot commit or roll back.
  createConfiguredSimulation(configuration: SimulationConfiguration, simulation: Simulation): Promise<"created" | "already-exists">;
  findConfiguration(id: SimulationId): Promise<SimulationConfiguration | undefined>;
  listConfigurations(): Promise<readonly SimulationConfiguration[]>;
}
export type ConfigureSimulationCommand = Readonly<{
  simulationId: SimulationId; projectRoot: string; setup: SimulationSetup;
}>;
export type ConfigureSimulationDependencies = Readonly<{
  projects: ProjectInspector; configurations: SimulationConfigurationStore;
}>;
