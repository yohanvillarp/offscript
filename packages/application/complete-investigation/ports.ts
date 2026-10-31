import type {
  AgentId,
  CompletedInvestigation,
  InvestigationId,
  InvestigationResult,
  SimulationId,
} from "../../domain/index.ts";
import type { EventOrigin, InvestigationEvent } from "../../contracts/index.ts";
import type { SimulationReader } from "../request-investigation/ports.ts";
import type { VersionedInvestigation } from "../assign-investigation/ports.ts";

export type InvestigationCompletedEvent = Extract<
  InvestigationEvent,
  { type: "investigation.completed" }
>;

export interface InvestigationCompletionCommitter {
  findInvestigation(id: InvestigationId): Promise<VersionedInvestigation | undefined>;
  commitCompletion(
    event: InvestigationCompletedEvent,
    expectedRevision: number,
  ): Promise<"saved" | "duplicate" | "conflict" | "not-found" | "event-conflict">;
}

export type CompleteInvestigationCommand = Readonly<{
  investigationId: InvestigationId;
  simulationId: SimulationId;
  completedBy: AgentId;
  result: InvestigationResult;
  origin: EventOrigin;
  completedAt: string;
  eventId: string;
  correlationId: string;
}>;

export type CompleteInvestigationDependencies = Readonly<{
  simulations: SimulationReader;
  investigations: InvestigationCompletionCommitter;
}>;

export type CompleteInvestigationResult = Readonly<{
  investigation: CompletedInvestigation;
  revision: number;
  event: InvestigationCompletedEvent;
  publication: Readonly<{ status: "queued" | "already-recorded" }>;
}>;
