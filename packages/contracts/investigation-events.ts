import { ContractValidationError } from "./errors.ts";
import { parseEventEnvelope } from "./event-envelope.ts";
import type { EventMetadata } from "./events.ts";
import { parseInvestigationSummary } from "./investigation-summary.ts";
import type { InvestigationSummary } from "./investigation-summary.ts";
import { record } from "./validation.ts";

export type InvestigationPayloads = {
  readonly "investigation.requested": Readonly<{
    investigation: InvestigationSummary & { readonly lifecycle: { readonly status: "requested" } };
  }>;
  readonly "investigation.assigned": Readonly<{
    investigation: InvestigationSummary & { readonly lifecycle: { readonly status: "assigned" } };
  }>;
  readonly "investigation.completed": Readonly<{
    investigation: InvestigationSummary & { readonly lifecycle: { readonly status: "completed" } };
  }>;
};

export type InvestigationEvent = {
  [K in keyof InvestigationPayloads]: Readonly<EventMetadata & {
    type: K; schemaVersion: 1; payload: InvestigationPayloads[K];
  }>;
}[keyof InvestigationPayloads];

export function parseInvestigationEvent(value: unknown): InvestigationEvent {
  const { input, base } = parseEventEnvelope(value);
  const payload = record(input.payload, "event.payload", ["investigation"]);
  const investigation = parseInvestigationSummary(payload.investigation);
  if (investigation.simulationId !== base.simulationId) {
    throw new ContractValidationError("event.payload.investigation.simulationId", "Simulation ID does not match the envelope.");
  }
  const state = investigation.lifecycle;
  switch (input.type) {
    case "investigation.requested":
      if (state.status !== "requested") break;
      if (base.origin.kind === "agent" && base.origin.agentId !== investigation.requestedBy) {
        throw new ContractValidationError("event.origin.agentId", "Origin must match the requesting agent.");
      }
      return Object.freeze({ ...base, type: input.type, payload: Object.freeze({
        investigation: Object.freeze({ ...investigation, lifecycle: state }),
      }) });
    case "investigation.assigned":
      if (state.status !== "assigned") break;
      // The assigning origin need not be an assignee. Authorization is external.
      return Object.freeze({ ...base, type: input.type, payload: Object.freeze({
        investigation: Object.freeze({ ...investigation, lifecycle: state }),
      }) });
    case "investigation.completed":
      if (state.status !== "completed") break;
      if (base.origin.kind === "agent" && base.origin.agentId !== state.completedBy) {
        throw new ContractValidationError("event.origin.agentId", "Origin must match the result author.");
      }
      return Object.freeze({ ...base, type: input.type, payload: Object.freeze({
        investigation: Object.freeze({ ...investigation, lifecycle: state }),
      }) });
    default:
      throw new ContractValidationError("event.type", "Unknown investigation event type.");
  }
  throw new ContractValidationError("event.payload.investigation.lifecycle.status", "Lifecycle does not match event type.");
}
