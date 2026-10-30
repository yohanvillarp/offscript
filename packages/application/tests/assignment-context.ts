import { agentId, requestInvestigation, updateSimulationAgent } from "../../domain/index.ts";
import type { InvestigationId } from "../../domain/index.ts";
import type {
  AssignInvestigationCommand, AssignInvestigationDependencies, InvestigationAssignedEvent, VersionedInvestigation,
} from "../index.ts";
import { command, observation, runningSimulation } from "./memory-context.ts";

export function assignmentCommand(): AssignInvestigationCommand {
  return {
    investigationId: command().investigationId, simulationId: command().simulationId,
    agentIds: [agentId("explorer")], origin: { kind: "system" },
    assignedAt: "2026-10-30T12:01:00.000Z", eventId: "assignment-1", correlationId: "exploration-1",
  };
}

export function assignmentContext() {
  const simulations = new Map([[command().simulationId,
    updateSimulationAgent(runningSimulation(), agentId("beginner"), { status: "running" })]]);
  const requested = requestInvestigation({
    id: command().investigationId, simulationId: command().simulationId, requestedBy: command().requestedBy,
    hypothesis: command().hypothesis, requestedAt: command().requestedAt,
  }, [observation()]);
  const records = new Map<InvestigationId, VersionedInvestigation>([[requested.id, Object.freeze({ investigation: requested, revision: 0 })]]);
  const events: InvestigationAssignedEvent[] = [];
  const calls: string[] = [];
  const dependencies: AssignInvestigationDependencies = {
    simulations: { async findSimulation(id) { calls.push("read-simulation"); return simulations.get(id); } },
    investigations: {
      async findInvestigation(id) { calls.push("read-investigation"); return records.get(id); },
      async commitAssignment(event, revision) {
        const investigation = event.payload.investigation;
        const prior = events.find(item => item.eventId === event.eventId);
        if (prior) return JSON.stringify(prior) === JSON.stringify(event) ? "duplicate" : "event-conflict";
        calls.push("save");
        const current = records.get(investigation.id);
        if (!current) return "not-found";
        if (current.revision !== revision) return "conflict";
        events.push(event);
        records.set(investigation.id, Object.freeze({ investigation, revision: revision + 1 }));
        return "saved";
      },
    },
  };
  return { requested, simulations, records, events, calls, dependencies };
}
