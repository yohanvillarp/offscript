import type { AgentId, AssignedInvestigation, Investigation, InvestigationId, SimulationId } from "../../domain/index.ts";
import type { EventOrigin, InvestigationEvent } from "../../contracts/index.ts";
import type { SimulationReader } from "../request-investigation/ports.ts";

export type VersionedInvestigation = Readonly<{ investigation: Investigation; revision: number }>;
export type InvestigationAssignedEvent = Extract<InvestigationEvent, { type: "investigation.assigned" }>;

export interface InvestigationAssignmentStore {
  findInvestigation(id: InvestigationId): Promise<VersionedInvestigation | undefined>;
  // Atomic compare-and-set: check identity/revision, replace, and increment the
  // revision together. A rejection can still have an unknown commit outcome.
  saveAssignment(investigation: AssignedInvestigation, expectedRevision: number): Promise<"saved" | "conflict" | "not-found">;
}

export interface InvestigationAssignedPublisher {
  publishInvestigationAssigned(event: InvestigationAssignedEvent): Promise<void>;
}

export type AssignInvestigationCommand = Readonly<{
  investigationId: InvestigationId;
  simulationId: SimulationId;
  agentIds: readonly AgentId[];
  origin: EventOrigin;
  assignedAt: string;
  eventId: string;
  correlationId: string;
}>;

export type AssignInvestigationDependencies = Readonly<{
  simulations: SimulationReader;
  investigations: InvestigationAssignmentStore;
  events: InvestigationAssignedPublisher;
}>;

export type AssignInvestigationResult = Readonly<{
  investigation: AssignedInvestigation;
  revision: number;
  event: InvestigationAssignedEvent;
  publication: Readonly<{ status: "published" }> | Readonly<{ status: "unconfirmed"; cause: unknown }>;
}>;
