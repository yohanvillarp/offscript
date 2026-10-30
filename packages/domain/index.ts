export { DomainError } from "./errors.ts";
export type { DomainErrorCode } from "./errors.ts";
export { agentId, simulationId } from "./identity.ts";
export type { AgentId, SimulationId } from "./identity.ts";
export { observationId, evidenceId } from "./identity.ts";
export type { ObservationId, EvidenceId } from "./identity.ts";
export { createObservation } from "./observation.ts";
export type { Observation, ObservationContext } from "./observation.ts";
export { investigationId } from "./identity.ts";
export type { InvestigationId } from "./identity.ts";
export { createInvestigationResult } from "./investigation-result.ts";
export type { InvestigationOutcome, InvestigationResult } from "./investigation-result.ts";
export { requestInvestigation, assignInvestigation, completeInvestigation } from "./investigation.ts";
export type {
  Investigation, InvestigationRequest, InvestigationLifecycle, InvestigationAssignment,
  RequestedInvestigation, AssignedInvestigation, CompletedInvestigation,
} from "./investigation.ts";
export { createAgentProfile } from "./profile.ts";
export type { AgentProfile, AgentGoal, DeclaredCapability } from "./profile.ts";
export type { ExecutionEnvironment } from "./environment.ts";
export { createAgent, transitionAgent } from "./agent.ts";
export type { Agent, AgentLifecycle } from "./agent.ts";
export { createSimulation, transitionSimulation, updateSimulationAgent } from "./simulation.ts";
export type { Simulation, SimulationLifecycle } from "./simulation.ts";
