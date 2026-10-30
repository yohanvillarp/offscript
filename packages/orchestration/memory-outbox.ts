import { validateClaim } from "../application/index.ts";
import type { OutboxStore, OutboxRecord, OutboxLease, OutboxEvent } from "../application/index.ts";
import { serializeSemanticEvent } from "../contracts/index.ts";

// Ephemeral adapter for controlled sessions; SQLite provides durable delivery.
export function createMemoryOutbox() {
  const records = new Map<string, OutboxRecord>();
  let sequence = 0;
  let reservation = 0;
  function identity(event: OutboxEvent, revision: number) {
    const eventJson = serializeSemanticEvent(event);
    const previous = records.get(event.eventId);
    if (!previous) return undefined;
    return previous.eventJson === eventJson && previous.revision === revision ? "duplicate" : "event-conflict";
  }
  function append(event: OutboxEvent, revision: number) {
    if (records.has(event.eventId)) throw new Error("Duplicate outbox event.");
    records.set(event.eventId, Object.freeze({ sequence: ++sequence, eventId: event.eventId,
      simulationId: event.simulationId, investigationId: event.payload.investigation.id, revision,
      eventJson: serializeSemanticEvent(event), status: "pending", attempts: 0, availableAt: 0,
      leaseToken: null, leaseUntil: null, acceptedAt: null, lastError: null }));
  }
  function change(id: string, token: string, now: number, update: Partial<OutboxRecord>) {
    const row = records.get(id);
    if (!row || row.status !== "leased" || row.leaseToken !== token || row.leaseUntil === null || row.leaseUntil <= now) return false;
    records.set(id, Object.freeze({ ...row, ...update, leaseToken: null, leaseUntil: null }));
    return true;
  }
  const store: OutboxStore = {
    async claim(options) {
      validateClaim(options);
      const leases: OutboxLease[] = [];
      for (const row of records.values()) {
        if (leases.length >= options.limit) break;
        if (!((row.status === "pending" && row.availableAt <= options.now) ||
          (row.status === "leased" && row.leaseUntil !== null && row.leaseUntil <= options.now))) continue;
        if ([...records.values()].some(older => older.investigationId === row.investigationId && older.sequence < row.sequence && older.status !== "accepted")) continue;
        if (row.attempts >= options.maxAttempts) {
          records.set(row.eventId, Object.freeze({ ...row, status: "failed", leaseToken: null, leaseUntil: null, lastError: "ATTEMPTS_EXHAUSTED" }));
          continue;
        }
        const lease: OutboxLease = Object.freeze({ ...row, status: "leased", attempts: row.attempts + 1,
          leaseToken: `${options.token}:${++reservation}`, leaseUntil: options.now + options.leaseMs });
        records.set(row.eventId, lease);
        leases.push(lease);
      }
      return Object.freeze(leases);
    },
    async accept(id, token, now) { return change(id, token, now, { status: "accepted", acceptedAt: now, lastError: null }); },
    async defer(id, token, now, at) {
      const row = records.get(id);
      return change(id, token, now, { status: "pending", availableAt: at, attempts: (row?.attempts ?? 1) - 1 });
    },
    async reject(id, token, now, error, at) { return change(id, token, now, { status: at === null ? "failed" : "pending", availableAt: at ?? now, lastError: error }); },
    async inspect(id) { return records.get(id); },
    async hasPending(id) { return [...records.values()].some(r => r.simulationId === id && (r.status === "pending" || r.status === "leased")); },
  };
  return Object.freeze({ store, append, identity, pending: () => [...records.values()].some(r => r.status === "pending" || r.status === "leased") });
}
