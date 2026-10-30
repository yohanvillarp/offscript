import type { Agent, Simulation, SimulationId } from "../domain/index.ts";
import { parseAgentSummary, parseSimulationSummary } from "./summaries.ts";
import type { AgentSummary, SimulationSummary } from "./summaries.ts";

export function toAgentSummary(simulationId: SimulationId, agent: Agent): AgentSummary {
  return parseAgentSummary({
    id: agent.id,
    simulationId,
    name: agent.profile.name,
    lifecycle: agent.lifecycle,
  });
}

export function toSimulationSummary(simulation: Simulation): SimulationSummary {
  return parseSimulationSummary({
    id: simulation.id,
    environment: simulation.environment,
    lifecycle: simulation.lifecycle,
    agentIds: simulation.agents.map((agent) => agent.id),
  });
}
