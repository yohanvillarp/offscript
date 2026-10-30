import {
  agentId, simulationId, createAgent, createAgentProfile, createSimulation,
  transitionAgent, transitionSimulation, updateSimulationAgent,
} from "../../domain/index.ts";
import type { AgentLifecycle, SimulationLifecycle } from "../../domain/index.ts";
import { toAgentSummary, toSimulationSummary } from "../index.ts";
import type { LifecycleEventType } from "../index.ts";

export const simulationIdentity = simulationId("simulation-1");
export const agentIdentity = agentId("agent-1");
export const time = "2026-10-30T12:00:00.000Z";

export function domainAgent() {
  return createAgent(agentIdentity, createAgentProfile({
    name: "Curious visitor", personality: "Explores unexpected paths",
    goals: [{ description: "Explore the checkout" }], capabilities: ["web.interact"],
  }));
}

export function agentSummary(status: AgentLifecycle["status"] = "running") {
  let agent = domainAgent();
  if (status !== "ready") {
    agent = transitionAgent(agent, { status: "running" });
    if (status !== "running") {
      agent = transitionAgent(agent, status === "failed" ? { status, reason: "Target unavailable" } : { status });
    }
  }
  return toAgentSummary(simulationIdentity, agent);
}

export function simulationSummary(status: SimulationLifecycle["status"] = "running") {
  let simulation = createSimulation(simulationIdentity, { kind: "web", deployment: "test" }, [domainAgent()]);
  if (status !== "created") {
    simulation = transitionSimulation(simulation, { status: "running" });
    if (status === "completed") {
      simulation = updateSimulationAgent(simulation, agentIdentity, { status: "cancelled" });
    }
    if (status !== "running") {
      simulation = transitionSimulation(simulation, status === "failed" ? { status, reason: "Session interrupted" } : { status });
    }
  }
  return toSimulationSummary(simulation);
}

export const eventTypes: readonly LifecycleEventType[] = [
  "simulation.started", "simulation.completed", "simulation.failed", "simulation.cancelled",
  "agent.started", "agent.completed", "agent.failed", "agent.cancelled",
];

export function eventInput(type: LifecycleEventType = "agent.started") {
  const [scope, action] = type.split(".") as ["simulation" | "agent", "started" | "completed" | "failed" | "cancelled"];
  const status = action === "started" ? "running" : action;
  return {
    eventId: `event-${type}`, type, schemaVersion: 1, occurredAt: time,
    simulationId: simulationIdentity, correlationId: "correlation-1", origin: { kind: "system" },
    payload: scope === "simulation" ? { simulation: simulationSummary(status) } : { agent: agentSummary(status) },
  };
}
