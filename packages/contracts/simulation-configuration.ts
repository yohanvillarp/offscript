import type { SimulationId } from "../domain/index.ts";
import type { SimulationSetup } from "./simulation-setup.ts";
import { parseExecutionLimits, parseSimulationSetup } from "./simulation-setup.ts";
import { oneOf, readSimulationId, record, text } from "./validation.ts";
import { parseTargetSuggestion } from "./target-connection.ts";
import type { TargetSuggestion } from "./target-connection.ts";

export type SimulationConfiguration = SimulationSetup & Readonly<{
  simulationId: SimulationId; name: string; projectRoot: string;
}>;
export type ProjectDescriptor = Readonly<{
  rootPath: string; suggestedName: string; nameSource: "package" | "directory"; targetSuggestion?: TargetSuggestion;
}>;
export function parseProjectDescriptor(value: unknown): ProjectDescriptor {
  const input = record(value, "project", ["rootPath", "suggestedName", "nameSource", "targetSuggestion"]);
  return Object.freeze({ rootPath: text(input.rootPath, "project.rootPath"), suggestedName: text(input.suggestedName, "project.suggestedName"),
    nameSource: oneOf(input.nameSource, ["package", "directory"] as const, "project.nameSource"),
    ...(input.targetSuggestion === undefined ? {} : { targetSuggestion: parseTargetSuggestion(input.targetSuggestion) }) });
}

export function parseSimulationConfiguration(value: unknown): SimulationConfiguration {
  const input = record(value, "configuration", ["simulationId", "projectRoot", "name", "targetUrl", "environment", "goal", "userProfileIds", "limits"]);
  const setup = parseSimulationSetup({ name: text(input.name, "configuration.name"),
    targetUrl: input.targetUrl, environment: input.environment, goal: input.goal,
    userProfileIds: input.userProfileIds, limits: parseExecutionLimits(input.limits) });
  return Object.freeze({ ...setup, simulationId: readSimulationId(input.simulationId, "configuration.simulationId"),
    projectRoot: text(input.projectRoot, "configuration.projectRoot"), name: text(setup.name, "configuration.name") });
}
