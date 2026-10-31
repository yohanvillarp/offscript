import { deserializeSemanticEvent } from "../../contracts/index.ts";
import type { DispatchOptions, OutboxPublisher, OutboxStore, OutboxEvent } from "./ports.ts";
import { validateDispatch } from "./ports.ts";

export async function dispatchOutboxBatch(dependencies: Readonly<{
  store: OutboxStore; publisher: OutboxPublisher; now: () => number; token: () => string;
}>, options: DispatchOptions) {
  validateDispatch(options);
  const leases = await dependencies.store.claim({
    now: dependencies.now(), leaseMs: options.leaseMs, limit: options.batchSize,
    maxAttempts: options.maxAttempts, token: dependencies.token(),
  });
  const stats = { claimed: leases.length, accepted: 0, deferred: 0, rejected: 0, stale: 0 };
  for (const lease of leases) {
    if (dependencies.now() >= lease.leaseUntil) { stats.stale++; continue; }
    let event: OutboxEvent;
    try {
      const parsed = deserializeSemanticEvent(lease.eventJson);
      if ((parsed.type !== "investigation.requested" && parsed.type !== "investigation.assigned" && parsed.type !== "investigation.completed") ||
          parsed.eventId !== lease.eventId || parsed.simulationId !== lease.simulationId ||
          parsed.payload.investigation.id !== lease.investigationId ||
          (parsed.type === "investigation.requested" ? lease.revision !== 0 : lease.revision < 1)) throw new Error("Outbox event identity mismatch.");
      event = parsed;
    } catch {
      const updated = await dependencies.store.reject(lease.eventId, lease.leaseToken, dependencies.now(), "INVALID_EVENT", null);
      stats[updated ? "rejected" : "stale"]++;
      continue;
    }
    let outcome: "accepted" | "deferred";
    try { outcome = await dependencies.publisher.publish(event); } catch {
      const now = dependencies.now();
      const backoff = Math.min(options.retryMaxMs, options.retryBaseMs * 2 ** Math.min(lease.attempts - 1, 30));
      const updated = await dependencies.store.reject(lease.eventId, lease.leaseToken, now, "PUBLISH_REJECTED", lease.attempts >= options.maxAttempts ? null : now + backoff);
      stats[updated ? "rejected" : "stale"]++;
      continue;
    }
    const now = dependencies.now();
    const updated = outcome === "deferred"
      ? await dependencies.store.defer(lease.eventId, lease.leaseToken, now, now + options.deferMs)
      : await dependencies.store.accept(lease.eventId, lease.leaseToken, now);
    stats[updated ? outcome : "stale"]++;
  }
  return Object.freeze(stats);
}
