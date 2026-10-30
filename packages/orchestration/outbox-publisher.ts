import type { OutboxPublisher } from "../application/index.ts";
import type { SemanticEvent } from "../contracts/index.ts";
import type { SimulationId } from "../domain/index.ts";

type ActiveSession = Readonly<{
  canAcceptEvent(event: SemanticEvent): boolean;
  publishEvent(event: SemanticEvent): void;
}>;

// Resolving a session must never create one or restore its participants.
export function createMozaikOutboxPublisher(resolve: (simulationId: SimulationId) => ActiveSession | undefined): OutboxPublisher {
  return {
    async publish(event) {
      const session = resolve(event.simulationId);
      if (!session || !session.canAcceptEvent(event)) return "deferred";
      session.publishEvent(event);
      // Mozaik accepted dispatch; reactive processing may still be in progress.
      return "accepted";
    },
  };
}
