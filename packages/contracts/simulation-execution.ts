import { simulationId } from "../domain/index.ts";
import type { SimulationId } from "../domain/index.ts";
import { ContractValidationError } from "./errors.ts";
import { oneOf, record, text } from "./validation.ts";

export const simulationExecutionModes = ["controlled-demo", "browser-exploration"] as const;
export type SimulationExecutionMode = typeof simulationExecutionModes[number];

export const simulationExecutionPhases = [
  "idle",
  "starting",
  "running",
  "stopping",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
] as const;
export type SimulationExecutionPhase = typeof simulationExecutionPhases[number];

export type SimulationExecutionStatus = Readonly<{
  simulationId: SimulationId;
  phase: SimulationExecutionPhase;
  mode: SimulationExecutionMode;
  turnsCount: number;
  activeAgents: readonly string[];
  failureReason?: string;
  startedAt?: string;
  stoppedAt?: string;
}>;

export type StartSimulationRequest = Readonly<{
  mode: SimulationExecutionMode;
}>;

export function parseStartSimulationRequest(value: unknown): StartSimulationRequest {
  const input = record(value, "startRequest", ["mode"]);
  const mode = oneOf(input.mode, simulationExecutionModes, "startRequest.mode");
  return Object.freeze({ mode });
}

export function parseSimulationExecutionStatus(value: unknown): SimulationExecutionStatus {
  const input = record(value, "executionStatus", [
    "simulationId", "phase", "mode", "turnsCount", "activeAgents", "failureReason", "startedAt", "stoppedAt",
  ]);
  const id = simulationId(text(input.simulationId, "executionStatus.simulationId"));
  const phase = oneOf(input.phase, simulationExecutionPhases, "executionStatus.phase");
  const mode = oneOf(input.mode, simulationExecutionModes, "executionStatus.mode");
  if (typeof input.turnsCount !== "number" || !Number.isSafeInteger(input.turnsCount) || input.turnsCount < 0) {
    throw new ContractValidationError("executionStatus.turnsCount", "Expected a non-negative integer.");
  }
  if (!Array.isArray(input.activeAgents) || input.activeAgents.some((item) => typeof item !== "string")) {
    throw new ContractValidationError("executionStatus.activeAgents", "Expected an array of agent identifiers.");
  }
  const failureReason = input.failureReason !== undefined ? text(input.failureReason, "executionStatus.failureReason") : undefined;
  const startedAt = input.startedAt !== undefined ? text(input.startedAt, "executionStatus.startedAt") : undefined;
  const stoppedAt = input.stoppedAt !== undefined ? text(input.stoppedAt, "executionStatus.stoppedAt") : undefined;
  return Object.freeze({
    simulationId: id,
    phase,
    mode,
    turnsCount: input.turnsCount,
    activeAgents: Object.freeze([...input.activeAgents]),
    ...(failureReason ? { failureReason } : {}),
    ...(startedAt ? { startedAt } : {}),
    ...(stoppedAt ? { stoppedAt } : {}),
  });
}
