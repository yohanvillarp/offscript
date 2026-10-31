import type {
  InvestigationAssignmentStore, InvestigationWriter,
  InvestigationRequestCommitter, InvestigationAssignmentCommitter,
  InvestigationCompletionCommitter,
} from "../application/index.ts";
import { parseInvestigationEvent } from "../contracts/index.ts";
import { assignInvestigation, completeInvestigation } from "../domain/index.ts";
import type { ExplorationState } from "./state.ts";

export function sessionInvestigationStore(
  state: ExplorationState,
): InvestigationAssignmentStore & InvestigationWriter & InvestigationRequestCommitter & InvestigationAssignmentCommitter & InvestigationCompletionCommitter {
  return {
    async commitRequest(input) {
      if (state.closed) throw new Error("Session closed before commit.");
      const event = parseInvestigationEvent(input);
      if (event.type !== "investigation.requested" || event.simulationId !== state.simulation.id) throw new Error("Invalid request scope.");
      const prior = state.outbox.identity(event, 0);
      if (prior) return prior;
      if (state.investigations.has(event.payload.investigation.id)) return "already-exists";
      state.outbox.append(event, 0);
      state.investigations.set(event.payload.investigation.id, Object.freeze({ investigation: event.payload.investigation, revision: 0 }));
      return "created";
    },
    async commitAssignment(input, revision) {
      if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) throw new Error("Invalid revision.");
      if (state.closed) throw new Error("Session closed before commit.");
      const event = parseInvestigationEvent(input);
      if (event.type !== "investigation.assigned" || event.simulationId !== state.simulation.id) throw new Error("Invalid assignment scope.");
      const prior = state.outbox.identity(event, revision + 1);
      if (prior) return prior;
      const current = state.investigations.get(event.payload.investigation.id);
      if (!current) return "not-found";
      if (current.revision !== revision) return "conflict";
      const value = event.payload.investigation;
      const existing = current.investigation.lifecycle.status === "requested" ? [] : current.investigation.lifecycle.agentIds;
      const expected = assignInvestigation(current.investigation, value.lifecycle.agentIds.filter(id => !existing.includes(id)), value.lifecycle.assignedAt);
      const normalized = parseInvestigationEvent({ ...event, payload: { investigation: expected } });
      if (JSON.stringify(normalized) !== JSON.stringify(event)) throw new Error("Assignment must preserve the existing investigation.");
      state.outbox.append(event, revision + 1);
      state.investigations.set(event.payload.investigation.id, Object.freeze({ investigation: event.payload.investigation, revision: revision + 1 }));
      return "saved";
    },
    async commitCompletion(input, revision) {
      if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) throw new Error("Invalid revision.");
      if (state.closed) throw new Error("Session closed before commit.");
      const event = parseInvestigationEvent(input);
      if (event.type !== "investigation.completed" || event.simulationId !== state.simulation.id) throw new Error("Invalid completion scope.");
      const prior = state.outbox.identity(event, revision + 1);
      if (prior) return prior;
      const current = state.investigations.get(event.payload.investigation.id);
      if (!current) return "not-found";
      if (current.revision !== revision) return "conflict";
      const value = event.payload.investigation;
      const expected = completeInvestigation(current.investigation, value.lifecycle.result, value.lifecycle.completedBy, value.lifecycle.completedAt);
      const normalized = parseInvestigationEvent({ ...event, payload: { investigation: expected } });
      if (JSON.stringify(normalized) !== JSON.stringify(event)) throw new Error("Completion must preserve the existing investigation.");
      state.outbox.append(event, revision + 1);
      state.investigations.set(event.payload.investigation.id, Object.freeze({ investigation: event.payload.investigation, revision: revision + 1 }));
      return "saved";
    },
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
