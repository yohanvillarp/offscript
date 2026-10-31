import type { InferenceRunner } from "@mozaik-ai/core";
import { createExplorationSession } from "./session.ts";
import { deterministicRunner } from "./deterministic-runner.ts";
import type { ExecutionSessionFactory } from "../runtime/host.ts";

export function createControlledDemoSessionFactory(options?: { runner?: InferenceRunner }): ExecutionSessionFactory {
  return (simulation, limits, storage) => {
    const allowedTools = new Map(simulation.agents.map((agent) => [
      agent.id,
      ["inspect_application", "record_observation", "request_investigation"] as const,
    ]));
    return createExplorationSession({
      simulation,
      model: "deterministic-fixture",
      runner: options?.runner ?? deterministicRunner(),
      allowedTools,
      maxTurnsPerAgent: limits.maxTurnsPerAgent,
      maxInferenceCallsPerTurn: limits.maxInferenceCallsPerTurn,
      inferenceTimeoutMs: limits.inferenceTimeoutMs,
      durationMs: limits.durationMs,
      storage: {
        observations: storage.observations,
        investigations: storage.investigations,
        outbox: storage.outbox,
      },
      outboxMode: "external",
    });
  };
}
