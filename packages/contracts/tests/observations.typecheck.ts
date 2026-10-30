import type { AgentId, ObservationId } from "../../domain/index.ts";
import type { SemanticEvent } from "../index.ts";

export function narrowObservation(event: SemanticEvent): ObservationId | undefined {
  if (event.type !== "observation.created") return undefined;
  const id: ObservationId = event.payload.observation.id;
  // @ts-expect-error An observation payload is not a lifecycle agent summary.
  void event.payload.agent;
  // @ts-expect-error Observation identity cannot be substituted for agent identity.
  const agent: AgentId = id;
  void agent;
  // @ts-expect-error Parsed evidence references are immutable.
  event.payload.observation.evidenceIds.push("new");
  return id;
}
