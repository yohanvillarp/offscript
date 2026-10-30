import type {
  AgentId, InvestigationId, Observation, ObservationId, RequestedInvestigation, Simulation, SimulationId,
} from "../../domain/index.ts";
import type { InvestigationEvent } from "../../contracts/index.ts";

export type InvestigationRequestedEvent = Extract<InvestigationEvent, { type: "investigation.requested" }>;

export interface SimulationReader {
  findSimulation(id: SimulationId): Promise<Simulation | undefined>;
}

export interface ObservationReader {
  findObservation(id: ObservationId): Promise<Observation | undefined>;
}

export interface InvestigationWriter {
  // Atomic create-if-absent; never overwrite an existing investigation.
  // A thrown error may have an unknown commit outcome, depending on the adapter.
  createInvestigation(investigation: RequestedInvestigation): Promise<"created" | "already-exists">;
}

export interface InvestigationRequestedPublisher {
  publishInvestigationRequested(event: InvestigationRequestedEvent): Promise<void>;
}

export type RequestInvestigationDependencies = Readonly<{
  simulations: SimulationReader;
  observations: ObservationReader;
  investigations: InvestigationWriter;
  events: InvestigationRequestedPublisher;
}>;

export type RequestInvestigationCommand = Readonly<{
  investigationId: InvestigationId;
  simulationId: SimulationId;
  requestedBy: AgentId;
  observationIds: readonly ObservationId[];
  hypothesis: string;
  requestedAt: string;
  eventId: string;
  correlationId: string;
}>;

export type RequestInvestigationResult = Readonly<{
  investigation: RequestedInvestigation;
  event: InvestigationRequestedEvent;
  publication: Readonly<{ status: "published" }> | Readonly<{ status: "unconfirmed"; cause: unknown }>;
}>;
