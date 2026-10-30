import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { OutboxStore, OutboxRecord, OutboxLease } from "../../application/index.ts";
import { validateClaim } from "../../application/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { outbox } from "../schema/index.ts";

export function outboxStore(db: PersistenceDatabase): OutboxStore {
  function fence(id: string, token: string, now: number) {
    if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid outbox time.");
    return and(eq(outbox.eventId, id), eq(outbox.status, "leased"), eq(outbox.leaseToken, token), gt(outbox.leaseUntil, now));
  }
  function availability(now: number, at: number) {
    if (!Number.isSafeInteger(at) || at < now) throw new Error("Invalid retry availability.");
  }
  return {
    async claim(options) {
      validateClaim(options);
      return db.transaction(tx => {
        const candidates = tx.select().from(outbox).where(sql`
          ((${outbox.status} = 'pending' and ${outbox.availableAt} <= ${options.now})
            or (${outbox.status} = 'leased' and ${outbox.leaseUntil} <= ${options.now}))
          and not exists (select 1 from event_outbox older
            where older.investigation_id = ${outbox.investigationId}
              and older.sequence < ${outbox.sequence} and older.status != 'accepted')
        `).orderBy(outbox.sequence).limit(options.limit).all();
        const leases: OutboxLease[] = [];
        for (const row of candidates) {
          if (row.attempts >= options.maxAttempts) {
            tx.update(outbox).set({ status: "failed", leaseToken: null, leaseUntil: null, lastError: "ATTEMPTS_EXHAUSTED" })
              .where(eq(outbox.sequence, row.sequence)).run();
            continue;
          }
          const lease = { ...row, status: "leased" as const, attempts: row.attempts + 1,
            leaseToken: `${options.token}:${randomUUID()}`, leaseUntil: options.now + options.leaseMs };
          tx.update(outbox).set({ status: lease.status, attempts: lease.attempts,
            leaseToken: lease.leaseToken, leaseUntil: lease.leaseUntil }).where(eq(outbox.sequence, row.sequence)).run();
          leases.push(Object.freeze(lease));
        }
        return Object.freeze(leases);
      }, { behavior: "immediate" });
    },
    async accept(id, token, now) {
      return db.update(outbox).set({ status: "accepted", acceptedAt: now, leaseToken: null, leaseUntil: null, lastError: null })
        .where(fence(id, token, now)).run().changes === 1;
    },
    async defer(id, token, now, at) {
      availability(now, at);
      return db.update(outbox).set({ status: "pending", availableAt: at, leaseToken: null, leaseUntil: null,
        attempts: sql`${outbox.attempts} - 1` }).where(fence(id, token, now)).run().changes === 1;
    },
    async reject(id, token, now, error, retryAt) {
      if (retryAt !== null) availability(now, retryAt);
      return db.update(outbox).set({ status: retryAt === null ? "failed" : "pending", availableAt: retryAt ?? now,
        leaseToken: null, leaseUntil: null, lastError: error }).where(fence(id, token, now)).run().changes === 1;
    },
    async inspect(id): Promise<OutboxRecord | undefined> {
      const row = db.select().from(outbox).where(eq(outbox.eventId, id)).get();
      return row && Object.freeze(row);
    },
    async hasPending(id) {
      return !!db.select({ sequence: outbox.sequence }).from(outbox)
        .where(and(eq(outbox.simulationId, id), inArray(outbox.status, ["pending", "leased"]))).limit(1).get();
    },
  };
}
