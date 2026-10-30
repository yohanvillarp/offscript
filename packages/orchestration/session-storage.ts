import type { Investigation } from "../domain/index.ts";
import type { Observation } from "../domain/index.ts";
import type { InvestigationAssignmentCommitter, InvestigationRequestCommitter, ObservationReader, OutboxStore } from "../application/index.ts";
import type { ExplorationState } from "./state.ts";
import { sessionInvestigationStore } from "./investigation-store.ts";

export type ExplorationStorage = Readonly<{
  investigations: InvestigationAssignmentCommitter & InvestigationRequestCommitter;
  observations: ObservationReader & {
    createObservation(observation: Observation): Promise<"created" | "already-exists">;
  };
  outbox: OutboxStore;
}>;

// Supplied storage must already contain the explicitly prepared simulation and
// roster. This adapter neither hydrates runtime participants nor owns the DB.
export function sessionStorage(state: ExplorationState, supplied?: ExplorationStorage): ExplorationStorage {
  const source: ExplorationStorage = supplied ?? {
    investigations: sessionInvestigationStore(state), outbox: state.outbox.store,
    observations: {
      async findObservation(id) { return state.observations.get(id); },
      async createObservation(value) {
        if (state.observations.has(value.id)) return "already-exists";
        state.observations.set(value.id, value); return "created";
      },
    },
  };
  function mirror(investigation: Investigation, revision: number) {
    const current = state.investigations.get(investigation.id);
    if (!current || current.revision < revision) state.investigations.set(investigation.id, Object.freeze({ investigation, revision }));
  }
  return {
    outbox: source.outbox, observations: source.observations,
    investigations: {
      findInvestigation: id => source.investigations.findInvestigation(id),
      async commitRequest(event) {
        if (state.closed) throw new Error("Session closed before request commit.");
        const result = await source.investigations.commitRequest(event);
        if (result === "created") mirror(event.payload.investigation, 0);
        return result;
      },
      async commitAssignment(event, expected) {
        if (state.closed) throw new Error("Session closed before assignment commit.");
        const result = await source.investigations.commitAssignment(event, expected);
        if (result === "saved") mirror(event.payload.investigation, expected + 1);
        return result;
      },
    },
  };
}
