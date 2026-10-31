import type { ExecutionEnvironment } from "../domain/index.ts";
import { ContractValidationError } from "./errors.ts";
import { oneOf, record, text } from "./validation.ts";

export const userProfileIds = ["explorer", "impatient", "beginner"] as const;
export type UserProfileId = typeof userProfileIds[number];
export type ExecutionLimits = Readonly<{
  maxTurnsPerAgent: number; maxInferenceCallsPerTurn: number; inferenceTimeoutMs: number; durationMs: number;
}>;
export const defaultExecutionLimits: ExecutionLimits = Object.freeze({
  maxTurnsPerAgent: 3, maxInferenceCallsPerTurn: 12, inferenceTimeoutMs: 15_000, durationMs: 30_000,
});
export type SimulationSetup = Readonly<{
  name?: string;
  targetUrl: string;
  environment: ExecutionEnvironment;
  goal: string;
  userProfileIds: readonly UserProfileId[];
  limits: ExecutionLimits;
}>;

export function parseExecutionLimits(value: unknown): ExecutionLimits {
  const input = record(value, "setup.limits", Object.keys(defaultExecutionLimits));
  function positive(key: keyof ExecutionLimits, maximum: number): number {
    const result = input[key];
    if (typeof result !== "number" || !Number.isSafeInteger(result) || result < 1 || result > maximum) {
      throw new ContractValidationError(`setup.limits.${key}`, `Expected an integer from 1 to ${maximum}.`);
    }
    return result;
  }
  const limits = Object.freeze({ maxTurnsPerAgent: positive("maxTurnsPerAgent", 100),
    maxInferenceCallsPerTurn: positive("maxInferenceCallsPerTurn", 100),
    inferenceTimeoutMs: positive("inferenceTimeoutMs", 2_147_483_647), durationMs: positive("durationMs", 2_147_483_647) });
  if (limits.inferenceTimeoutMs > limits.durationMs) {
    throw new ContractValidationError("setup.limits.inferenceTimeoutMs", "Inference timeout must not exceed the session duration.");
  }
  return limits;
}

function targetUrl(value: unknown): string {
  const input = text(value, "setup.targetUrl").trim();
  try {
    if (!/^https?:\/\//i.test(input)) throw new Error("Expected an absolute HTTP address.");
    const parsed = new URL(input);
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error("Invalid or credential-bearing address.");
    return parsed.href;
  } catch {
    throw new ContractValidationError("setup.targetUrl", "Expected an absolute HTTP(S) URL without embedded credentials.");
  }
}

export function parseSimulationSetup(value: unknown): SimulationSetup {
  const input = record(value, "setup", ["name", "targetUrl", "environment", "goal", "userProfileIds", "limits"]);
  const environment = record(input.environment, "setup.environment", ["kind", "deployment"]);
  if (!Array.isArray(input.userProfileIds) || !input.userProfileIds.length) {
    throw new ContractValidationError("setup.userProfileIds", "Select at least one behavioral profile.");
  }
  const profiles = Array.from(input.userProfileIds, (id: unknown) => oneOf(id, userProfileIds, "setup.userProfileIds"));
  if (new Set(profiles).size !== profiles.length) throw new ContractValidationError("setup.userProfileIds", "Profiles must be unique.");
  return Object.freeze({ ...(input.name === undefined ? {} : { name: text(input.name, "setup.name").trim() }),
    targetUrl: targetUrl(input.targetUrl), goal: text(input.goal, "setup.goal"),
    environment: Object.freeze({ kind: oneOf(environment.kind, ["web"] as const, "setup.environment.kind"),
      deployment: oneOf(environment.deployment, ["local", "development", "test", "staging", "production"] as const, "setup.environment.deployment") }),
    userProfileIds: Object.freeze(profiles),
    limits: parseExecutionLimits(input.limits === undefined ? defaultExecutionLimits : input.limits),
  });
}
