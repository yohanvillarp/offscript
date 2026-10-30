import type { AgentId, AgentLifecycle, ExecutionEnvironment, SimulationId, SimulationLifecycle } from "../domain/index.ts";
import { ContractValidationError } from "./errors.ts";
import { oneOf, readAgentId, readSimulationId, record, text } from "./validation.ts";

export type AgentSummary = Readonly<{
  id: AgentId;
  simulationId: SimulationId;
  name: string;
  lifecycle: AgentLifecycle;
}>;

export type SimulationSummary = Readonly<{
  id: SimulationId;
  environment: ExecutionEnvironment;
  lifecycle: SimulationLifecycle;
  agentIds: readonly AgentId[];
}>;

function lifecycle<const T extends readonly string[]>(value: unknown, statuses: T, path: string) {
  const input = record(value, path, ["status", "reason"]);
  const status = oneOf(input.status, statuses, `${path}.status`);
  if (status === "failed") {
    return Object.freeze({ status: "failed" as const, reason: text(input.reason, `${path}.reason`) });
  }
  if (Object.hasOwn(input, "reason")) {
    throw new ContractValidationError(`${path}.reason`, "Only a failed lifecycle carries a reason.");
  }
  return Object.freeze({ status: status as Exclude<T[number], "failed"> });
}

export function parseAgentSummary(value: unknown): AgentSummary {
  const input = record(value, "agent", ["id", "simulationId", "name", "lifecycle"]);
  return Object.freeze({
    id: readAgentId(input.id, "agent.id"),
    simulationId: readSimulationId(input.simulationId, "agent.simulationId"),
    name: text(input.name, "agent.name"),
    lifecycle: lifecycle(input.lifecycle, ["ready", "running", "completed", "failed", "cancelled"], "agent.lifecycle"),
  });
}

export function parseSimulationSummary(value: unknown): SimulationSummary {
  const input = record(value, "simulation", ["id", "environment", "lifecycle", "agentIds"]);
  const environment = record(input.environment, "simulation.environment", ["kind", "deployment"]);
  if (!Array.isArray(input.agentIds)) {
    throw new ContractValidationError("simulation.agentIds", "Expected an array.");
  }
  const agentIds = Array.from(input.agentIds, (id: unknown, index: number) =>
    readAgentId(id, `simulation.agentIds[${index}]`));
  if (new Set(agentIds).size !== agentIds.length) {
    throw new ContractValidationError("simulation.agentIds", "Agent IDs must be unique.");
  }
  return Object.freeze({
    id: readSimulationId(input.id, "simulation.id"),
    environment: Object.freeze({
      kind: oneOf(environment.kind, ["web"], "simulation.environment.kind"),
      deployment: oneOf(environment.deployment,
        ["local", "development", "test", "staging", "production"], "simulation.environment.deployment"),
    }),
    lifecycle: lifecycle(input.lifecycle, ["created", "running", "completed", "failed", "cancelled"], "simulation.lifecycle"),
    agentIds: Object.freeze(agentIds),
  });
}
