import { nonBlank } from "./errors.ts";

declare const simulationBrand: unique symbol;
declare const agentBrand: unique symbol;
declare const observationBrand: unique symbol;
declare const evidenceBrand: unique symbol;
declare const investigationBrand: unique symbol;

export type SimulationId = string & { readonly [simulationBrand]: true };
export type AgentId = string & { readonly [agentBrand]: true };
export type ObservationId = string & { readonly [observationBrand]: true };
export type EvidenceId = string & { readonly [evidenceBrand]: true };
export type InvestigationId = string & { readonly [investigationBrand]: true };

export function simulationId(value: string): SimulationId {
  return nonBlank(value, "Simulation ID") as SimulationId;
}

export function agentId(value: string): AgentId {
  return nonBlank(value, "Agent ID") as AgentId;
}

export function observationId(value: string): ObservationId {
  return nonBlank(value, "Observation ID") as ObservationId;
}

export function evidenceId(value: string): EvidenceId {
  return nonBlank(value, "Evidence ID") as EvidenceId;
}

export function investigationId(value: string): InvestigationId {
  return nonBlank(value, "Investigation ID") as InvestigationId;
}
