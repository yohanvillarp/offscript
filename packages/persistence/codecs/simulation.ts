import { createAgent, createAgentProfile, createSimulation, transitionSimulation, updateSimulationAgent } from "../../domain/index.ts";
import type { AgentProfile, Simulation } from "../../domain/index.ts";
import { parseAgentSummary, parseSimulationSummary } from "../../contracts/index.ts";
import { agents, simulations } from "../schema/index.ts";
import { PersistenceError } from "../errors.ts";
import { json, object, stored, text } from "./values.ts";

type SimulationRow = typeof simulations.$inferSelect;
type AgentRow = typeof agents.$inferSelect;

function profile(value: unknown): AgentProfile {
  const input = object(value, ["name", "personality", "goals", "capabilities"]);
  if (!Array.isArray(input.goals) || !Array.isArray(input.capabilities)) {
    throw new PersistenceError("INVALID_STORED_DATA", "Stored profile goals/capabilities must be arrays.");
  }
  return createAgentProfile({
    name: text(input.name), personality: text(input.personality),
    goals: Array.from(input.goals, (goal: unknown) => ({ description: text(object(goal, ["description"]).description) })),
    capabilities: Array.from(input.capabilities, (capability: unknown) => text(capability)),
  });
}

function lifecycle(row: { status: string; reason: string | null }) {
  return row.reason === null ? { status: row.status } : { status: row.status, reason: row.reason };
}

export function restoreSimulation(row: SimulationRow, members: readonly AgentRow[]): Simulation {
  return stored(() => {
    const summary = parseSimulationSummary({
      id: row.id, environment: { kind: row.environment, deployment: row.deployment },
      lifecycle: lifecycle(row), agentIds: members.map((member) => member.id),
    });
    const parsed = members.map((member) => {
      if (member.simulationId !== row.id) throw new PersistenceError("INVALID_STORED_DATA", "Agent belongs to another simulation.");
      const parsedProfile = profile(json(member.profile));
      return { profile: parsedProfile, summary: parseAgentSummary({
        id: member.id, simulationId: row.id, name: parsedProfile.name, lifecycle: lifecycle(member),
      }) };
    });
    let simulation = createSimulation(summary.id, summary.environment, parsed.map((member) => createAgent(member.summary.id, member.profile)));
    const status = summary.lifecycle.status;
    if (status !== "created") {
      if (status === "cancelled" && parsed.length === 0) return transitionSimulation(simulation, { status: "cancelled" });
      simulation = transitionSimulation(simulation, { status: "running" });
      for (const member of parsed) {
        const target = member.summary.lifecycle;
        if (target.status === "ready") continue;
        if (target.status !== "cancelled") simulation = updateSimulationAgent(simulation, member.summary.id, { status: "running" });
        if (target.status !== "running") simulation = updateSimulationAgent(simulation, member.summary.id, target);
      }
      if (status !== "running") simulation = transitionSimulation(simulation, summary.lifecycle);
    }
    if (parsed.some((member, index) => JSON.stringify(member.summary.lifecycle) !== JSON.stringify(simulation.agents[index]?.lifecycle))) {
      throw new PersistenceError("INVALID_STORED_DATA", "Simulation and participation lifecycles are inconsistent.");
    }
    return simulation;
  });
}

export function simulationRows(simulation: Simulation): { row: SimulationRow; members: AgentRow[] } {
  const row = {
    id: simulation.id, environment: simulation.environment.kind, deployment: simulation.environment.deployment,
    status: simulation.lifecycle.status, reason: simulation.lifecycle.status === "failed" ? simulation.lifecycle.reason : null,
  };
  const members = simulation.agents.map((agent, position) => ({
    simulationId: simulation.id, id: agent.id, position, profile: JSON.stringify(agent.profile),
    status: agent.lifecycle.status, reason: agent.lifecycle.status === "failed" ? agent.lifecycle.reason : null,
  }));
  restoreSimulation(row, members);
  return { row, members };
}
