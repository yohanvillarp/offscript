import { createAgent, transitionAgent } from "./agent.ts";
import type { Agent, AgentLifecycle } from "./agent.ts";
import type { ExecutionEnvironment } from "./environment.ts";
import { DomainError, nonBlank } from "./errors.ts";
import { simulationId } from "./identity.ts";
import type { AgentId, SimulationId } from "./identity.ts";

// Session lifecycle, separate from inference turns and goal achievement.
export type SimulationLifecycle =
  | Readonly<{ status: "created" | "running" | "completed" | "cancelled" }>
  | Readonly<{ status: "failed"; reason: string }>;

export type Simulation = Readonly<{
  id: SimulationId;
  environment: ExecutionEnvironment;
  lifecycle: SimulationLifecycle;
  agents: readonly Agent[];
}>;

export function createSimulation(
  id: SimulationId,
  environment: ExecutionEnvironment,
  agents: readonly Agent[],
): Simulation {
  const ids = new Set(agents.map((agent) => agent.id));
  if (ids.size !== agents.length) {
    throw new DomainError("DUPLICATE_AGENT", "Agent IDs must be unique within a simulation.");
  }
  if (agents.some((agent) => agent.lifecycle.status !== "ready")) {
    throw new DomainError("INVALID_TRANSITION", "New simulations require ready agents.");
  }
  return Object.freeze({
    id: simulationId(id),
    environment: Object.freeze({ kind: environment.kind, deployment: environment.deployment }),
    lifecycle: Object.freeze({ status: "created" as const }),
    agents: Object.freeze(agents.map((agent) => createAgent(agent.id, agent.profile))),
  });
}

function isTerminalAgent(agent: Agent): boolean {
  return agent.lifecycle.status === "completed" || agent.lifecycle.status === "failed" ||
    agent.lifecycle.status === "cancelled";
}

export function transitionSimulation(
  simulation: Simulation,
  next: SimulationLifecycle,
): Simulation {
  const current = simulation.lifecycle.status;
  const allowed = current === "created"
    ? next.status === "running" || next.status === "cancelled"
    : current === "running" && ["completed", "failed", "cancelled"].includes(next.status);
  if (!allowed) {
    throw new DomainError("INVALID_TRANSITION", `Simulation cannot move from ${current} to ${next.status}.`);
  }
  if (next.status === "running" && simulation.agents.length === 0) {
    throw new DomainError("EMPTY_SIMULATION", "A simulation needs at least one agent to start.");
  }
  if (next.status === "completed" && simulation.agents.some((agent) => !isTerminalAgent(agent))) {
    throw new DomainError("UNFINISHED_AGENTS", "Every agent must be terminal before the simulation completes.");
  }
  const lifecycle: SimulationLifecycle = next.status === "failed"
    ? Object.freeze({ status: "failed", reason: nonBlank(next.reason, "Failure reason") })
    : Object.freeze({ status: next.status });
  // Record logical cancellation only; this pure function cannot interrupt external work.
  const agents = simulation.agents.map((agent) => {
    if ((next.status === "cancelled" || next.status === "failed") &&
        (agent.lifecycle.status === "ready" || agent.lifecycle.status === "running")) {
      return transitionAgent(agent, { status: "cancelled" });
    }
    return agent;
  });
  return Object.freeze({ ...simulation, lifecycle, agents: Object.freeze(agents) });
}

export function updateSimulationAgent(
  simulation: Simulation,
  id: AgentId,
  next: AgentLifecycle,
): Simulation {
  if (simulation.lifecycle.status !== "running") {
    throw new DomainError("INVALID_TRANSITION", "Agents can only advance within a running simulation.");
  }
  const index = simulation.agents.findIndex((agent) => agent.id === id);
  const agent = simulation.agents[index];
  if (agent === undefined) throw new DomainError("AGENT_NOT_FOUND", `Unknown agent: ${id}`);
  const agents = [...simulation.agents];
  agents[index] = transitionAgent(agent, next);
  return Object.freeze({ ...simulation, agents: Object.freeze(agents) });
}
