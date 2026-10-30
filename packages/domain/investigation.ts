import { DomainError, nonBlank } from "./errors.ts";
import { agentId, investigationId, simulationId } from "./identity.ts";
import type { AgentId, InvestigationId, ObservationId, SimulationId } from "./identity.ts";
import { createInvestigationResult } from "./investigation-result.ts";
import type { InvestigationResult } from "./investigation-result.ts";
import { createObservation } from "./observation.ts";
import type { Observation } from "./observation.ts";
import { utcTimestamp } from "./timestamp.ts";

export type InvestigationRequest = Readonly<{
  id: InvestigationId;
  simulationId: SimulationId;
  requestedBy: AgentId;
  hypothesis: string;
  requestedAt: string;
}>;

type InvestigationBase = InvestigationRequest & Readonly<{ observationIds: readonly ObservationId[] }>;
export type InvestigationAssignment = Readonly<{ agentIds: readonly AgentId[]; assignedAt: string }>;
export type InvestigationLifecycle =
  | Readonly<{ status: "requested" }>
  | Readonly<InvestigationAssignment & { status: "assigned" }>
  | Readonly<InvestigationAssignment & {
    status: "completed";
    completedAt: string;
    completedBy: AgentId;
    result: InvestigationResult;
  }>;

export type Investigation = InvestigationBase & Readonly<{ lifecycle: InvestigationLifecycle }>;
export type RequestedInvestigation = InvestigationBase & Readonly<{ lifecycle: { readonly status: "requested" } }>;
export type AssignedInvestigation = InvestigationBase & Readonly<{
  lifecycle: InvestigationAssignment & { readonly status: "assigned" };
}>;
export type CompletedInvestigation = InvestigationBase & Readonly<{
  lifecycle: Extract<InvestigationLifecycle, { status: "completed" }>;
}>;

function assignmentIds(ids: readonly AgentId[]): readonly AgentId[] {
  if (ids.length === 0) throw new DomainError("INVALID_VALUE", "At least one assigned agent is required.");
  const result = ids.map(agentId);
  if (new Set(result).size !== result.length) {
    throw new DomainError("DUPLICATE_AGENT", "Investigation assignees must be unique.");
  }
  return Object.freeze(result);
}

export function requestInvestigation(input: InvestigationRequest, observations: readonly Observation[]): RequestedInvestigation {
  if (observations.length === 0) throw new DomainError("INVALID_VALUE", "An investigation requires an observation.");
  const observationIds = observations.map((value) => {
    const observation = createObservation(value);
    if (observation.simulationId !== input.simulationId) {
      throw new DomainError("INVALID_VALUE", "Related observations must belong to the investigation simulation.");
    }
    return observation.id;
  });
  if (new Set(observationIds).size !== observationIds.length) {
    throw new DomainError("INVALID_VALUE", "Related observations must be unique.");
  }
  return Object.freeze({
    id: investigationId(input.id), simulationId: simulationId(input.simulationId),
    requestedBy: agentId(input.requestedBy), hypothesis: nonBlank(input.hypothesis, "Investigation hypothesis"),
    requestedAt: utcTimestamp(input.requestedAt, "Request time"), observationIds: Object.freeze(observationIds),
    lifecycle: Object.freeze({ status: "requested" }),
  });
}

export function assignInvestigation(
  investigation: Investigation, agents: readonly AgentId[], assignedAt: string,
): AssignedInvestigation {
  const current = investigation.lifecycle;
  if (current.status === "completed") {
    throw new DomainError("INVALID_TRANSITION", "A completed investigation cannot accept assignments.");
  }
  const time = utcTimestamp(assignedAt, "Assignment time");
  const earliest = current.status === "assigned" ? current.assignedAt : investigation.requestedAt;
  if (time < earliest) throw new DomainError("INVALID_VALUE", "Assignment cannot precede the request or initial assignment.");
  const existing = current.status === "assigned" ? current.agentIds : [];
  const additions = assignmentIds(agents);
  if (additions.some((id) => existing.includes(id))) {
    throw new DomainError("DUPLICATE_AGENT", "An agent is already assigned to this investigation.");
  }
  return Object.freeze({ ...investigation, lifecycle: Object.freeze({
    status: "assigned", agentIds: assignmentIds([...existing, ...additions]),
    assignedAt: time,
  }) });
}

export function completeInvestigation(
  investigation: Investigation, result: InvestigationResult, completedBy: AgentId, completedAt: string,
): CompletedInvestigation {
  const current = investigation.lifecycle;
  if (current.status !== "assigned") {
    throw new DomainError("INVALID_TRANSITION", "Only an assigned investigation can be completed.");
  }
  const author = agentId(completedBy);
  if (!current.agentIds.includes(author)) {
    throw new DomainError("AGENT_NOT_FOUND", "The result author must be an assigned agent.");
  }
  const time = utcTimestamp(completedAt, "Completion time");
  if (time < current.assignedAt) throw new DomainError("INVALID_VALUE", "Completion cannot precede assignment.");
  return Object.freeze({ ...investigation, lifecycle: Object.freeze({
    status: "completed", agentIds: assignmentIds(current.agentIds), assignedAt: current.assignedAt,
    completedAt: time, completedBy: author, result: createInvestigationResult(result),
  }) });
}
