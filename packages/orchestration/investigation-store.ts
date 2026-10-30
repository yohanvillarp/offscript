import type { InvestigationAssignmentStore, InvestigationWriter } from "../application/index.ts";
import type { ExplorationState } from "./state.ts";

export function sessionInvestigationStore(state: ExplorationState): InvestigationAssignmentStore & InvestigationWriter {
  return {
    async findInvestigation(id) { return state.investigations.get(id); },
    async createInvestigation(investigation) {
      if (state.closed) throw new Error("Session closed before creating investigation.");
      if (state.investigations.has(investigation.id)) return "already-exists";
      state.investigations.set(investigation.id, Object.freeze({ investigation, revision: 0 }));
      return "created";
    },
    async saveAssignment(investigation, expectedRevision) {
      if (state.closed) throw new Error("Session closed before saving assignment.");
      const current = state.investigations.get(investigation.id);
      if (!current) return "not-found";
      if (current.revision !== expectedRevision) return "conflict";
      if (current.investigation.simulationId !== investigation.simulationId || investigation.simulationId !== state.simulation.id) {
        throw new Error("Assignment cannot change its simulation.");
      }
      // No await between comparison and replacement: atomic within this process.
      state.investigations.set(investigation.id, Object.freeze({ investigation, revision: expectedRevision + 1 }));
      return "saved";
    },
  };
}
