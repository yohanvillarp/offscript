import { ContractValidationError } from "./errors.ts";
import { parseLifecycleEvent } from "./event-validation.ts";
import type { LifecycleEvent } from "./events.ts";

export function createLifecycleEvent(input: LifecycleEvent): LifecycleEvent {
  return parseLifecycleEvent(input);
}

export function serializeLifecycleEvent(event: LifecycleEvent): string {
  return JSON.stringify(parseLifecycleEvent(event));
}

export function deserializeLifecycleEvent(json: string): LifecycleEvent {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new ContractValidationError("event", "Invalid JSON.");
  }
  return parseLifecycleEvent(input);
}
