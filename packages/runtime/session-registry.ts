import type { SemanticEvent } from "../contracts/index.ts";
import type { SimulationId } from "../domain/index.ts";
import type { OutboxPublisher } from "../application/index.ts";

export type HostedSession = Readonly<{
  canAcceptEvent(event: SemanticEvent): boolean;
  publishEvent(event: SemanticEvent): void;
  close(): Promise<void>;
}>;

export function sessionRegistry() {
  const sessions = new Map<SimulationId, HostedSession>();
  let accepting = true;
  const publisher: OutboxPublisher = {
    async publish(event) {
      const session = accepting ? sessions.get(event.simulationId) : undefined;
      if (!session || !session.canAcceptEvent(event)) return "deferred";
      session.publishEvent(event);
      return "accepted";
    },
  };
  return {
    publisher,
    add<T extends HostedSession>(id: SimulationId, create: () => T): T {
      if (!accepting) throw new Error("Host is closing.");
      if (sessions.has(id)) throw new Error("Simulation already has a hosted session.");
      const session = create();
      sessions.set(id, session);
      return session;
    },
    stopAdmission() { accepting = false; },
    async close() {
      accepting = false;
      const results = await Promise.allSettled([...sessions.values()].map(session => Promise.resolve().then(() => session.close())));
      sessions.clear();
      const failures = results.filter(result => result.status === "rejected");
      if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Session shutdown failed.");
    },
  };
}
