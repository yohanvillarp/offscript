import { SemanticEvent as MozaikEvent } from "@mozaik-ai/core";
import { parseSemanticEvent } from "../contracts/index.ts";
import type { SemanticEvent } from "../contracts/index.ts";
import type { ExplorationState } from "./state.ts";

export const offscriptEventType = "offscript.event";

function producer(event: SemanticEvent, state: ExplorationState): string {
  if (event.simulationId !== state.simulation.id) throw new Error("Event belongs to another simulation.");
  if (event.origin.kind === "system") return state.systemId;
  const participant = state.agents.get(event.origin.agentId);
  if (!participant) throw new Error("Event author is not mapped to this runtime.");
  return participant.getId();
}

export function encodeEvent(value: SemanticEvent, state: ExplorationState): MozaikEvent {
  const event = parseSemanticEvent(value);
  return new MozaikEvent(offscriptEventType, producer(event, state), new Date(event.occurredAt), event);
}

export function decodeEvent(value: MozaikEvent, state: ExplorationState): SemanticEvent {
  if (value.type !== offscriptEventType) throw new Error("Not an OFFSCRIPT event.");
  const event = parseSemanticEvent(value.payload);
  if (producer(event, state) !== value.producerId) throw new Error("Runtime producer does not match event origin.");
  if (value.occurredAt.toISOString() !== event.occurredAt) throw new Error("Event timestamp changed in transit.");
  return event;
}
