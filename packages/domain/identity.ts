import { nonBlank } from "./errors.ts";

declare const simulationBrand: unique symbol;
declare const agentBrand: unique symbol;

export type SimulationId = string & { readonly [simulationBrand]: true };
export type AgentId = string & { readonly [agentBrand]: true };

export function simulationId(value: string): SimulationId {
  return nonBlank(value, "Simulation ID") as SimulationId;
}

export function agentId(value: string): AgentId {
  return nonBlank(value, "Agent ID") as AgentId;
}
