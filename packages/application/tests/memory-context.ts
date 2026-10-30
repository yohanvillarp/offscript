import {
  agentId, createAgent, createAgentProfile, createObservation, createSimulation, investigationId,
  observationId, simulationId, transitionSimulation, updateSimulationAgent,
} from "../../domain/index.ts";
import type { InvestigationId, Observation, RequestedInvestigation, Simulation } from "../../domain/index.ts";
import type { InvestigationRequestedEvent, RequestInvestigationCommand, RequestInvestigationDependencies } from "../index.ts";

export function command(): RequestInvestigationCommand {
  return {
    investigationId: investigationId("investigation-1"), simulationId: simulationId("simulation-1"),
    requestedBy: agentId("explorer"), observationIds: [observationId("observation-1")],
    hypothesis: "Saved items may disappear after reload.", requestedAt: "2026-10-30T12:00:00.000Z",
    eventId: "event-1", correlationId: "exploration-1",
  };
}

export function readySimulation(): Simulation {
  const profile = createAgentProfile({
    name: "Artificial user", personality: "Curious", goals: [{ description: "Explore the cart" }], capabilities: [],
  });
  return createSimulation(command().simulationId, { kind: "web", deployment: "test" }, [
    createAgent(agentId("explorer"), profile), createAgent(agentId("beginner"), profile),
  ]);
}

export function runningSimulation(): Simulation {
  const simulation = transitionSimulation(readySimulation(), { status: "running" });
  return updateSimulationAgent(simulation, agentId("explorer"), { status: "running" });
}

export function observation(): Observation {
  return createObservation({
    id: observationId("observation-1"), simulationId: command().simulationId, agentId: agentId("beginner"),
    observedAt: command().requestedAt, description: "Saved item vanished.", context: { location: "/cart" }, evidenceIds: [],
  });
}

export function memoryContext() {
  const simulations = new Map([[command().simulationId, runningSimulation()]]);
  const observations = new Map([[observationId("observation-1"), observation()]]);
  const investigations = new Map<InvestigationId, RequestedInvestigation>();
  const events: InvestigationRequestedEvent[] = [];
  const calls: string[] = [];
  const dependencies: RequestInvestigationDependencies = {
    simulations: { async findSimulation(id) { calls.push("read-simulation"); return simulations.get(id); } },
    observations: { async findObservation(id) { calls.push("read-observation"); return observations.get(id); } },
    investigations: { async commitRequest(event) {
      const value = event.payload.investigation;
      const prior = events.find(item => item.eventId === event.eventId);
      if (prior) return JSON.stringify(prior) === JSON.stringify(event) ? "duplicate" : "event-conflict";
      calls.push("save");
      if (investigations.has(value.id)) return "already-exists";
      investigations.set(value.id, value);
      events.push(event);
      return "created";
    } },
  };
  return { simulations, observations, investigations, events, calls, dependencies };
}
