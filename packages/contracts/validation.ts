import { agentId, simulationId } from "../domain/index.ts";
import type { AgentId, SimulationId } from "../domain/index.ts";
import { ContractValidationError } from "./errors.ts";

export function record(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractValidationError(path, "Expected a plain object.");
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ContractValidationError(path, "Expected a plain object.");
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !keys.includes(key))) {
    throw new ContractValidationError(path, "Unknown fields are not supported by this schema.");
  }
  return value as Record<string, unknown>;
}

export function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ContractValidationError(path, "Expected a nonblank string.");
  }
  return value;
}

export function oneOf<const T extends readonly string[]>(value: unknown, values: T, path: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new ContractValidationError(path, "Unsupported value.");
  }
  return value;
}

export function readAgentId(value: unknown, path: string): AgentId {
  return agentId(text(value, path));
}

export function readSimulationId(value: unknown, path: string): SimulationId {
  return simulationId(text(value, path));
}

export function timestamp(value: unknown, path: string): string {
  const result = text(value, path);
  const date = new Date(result);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) ||
      !Number.isFinite(date.getTime()) || date.toISOString() !== result) {
    throw new ContractValidationError(path, "Expected a valid UTC timestamp in YYYY-MM-DDTHH:mm:ss.sssZ format.");
  }
  return result;
}
