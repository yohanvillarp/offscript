import {
  agentId, createAgent, createAgentProfile, createSimulation, simulationId, transitionSimulation,
} from "../../packages/domain/index.ts";
import type { AgentId } from "../../packages/domain/index.ts";
import type { ToolName } from "../../packages/orchestration/index.ts";

export function scenario(name = "integration-session") {
  const beginner = createAgent(agentId("beginner"), createAgentProfile({
    name: "Compass", personality: "Beginner: curious and unfamiliar with the product; follows visible guidance.",
    goals: [{ description: "Understand whether items stay in the cart after reload." }], capabilities: [],
  }));
  const explorer = createAgent(agentId("explorer"), createAgentProfile({
    name: "Raven", personality: "Explorer: observant and experimental; checks alternative explanations.",
    goals: [{ description: "Explore the cart and contribute independent observations to useful investigations." }], capabilities: [],
  }));
  const simulation = transitionSimulation(createSimulation(simulationId(name), { kind: "web", deployment: "test" }, [beginner, explorer]), { status: "running" });
  const permissions = new Map<AgentId, readonly ToolName[]>(simulation.agents.map((agent) => [
    agent.id, ["inspect_application", "record_observation", "request_investigation"],
  ]));
  return { simulation, permissions, beginner: beginner.id, explorer: explorer.id };
}
