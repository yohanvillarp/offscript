import type { InvestigationEvent } from "../../contracts/index.ts";

export type OutboxEvent = Exclude<InvestigationEvent, { type: "investigation.completed" }>;
export type OutboxError = "PUBLISH_REJECTED" | "INVALID_EVENT" | "ATTEMPTS_EXHAUSTED";
export type OutboxRecord = Readonly<{
  sequence: number; eventId: string; simulationId: string; investigationId: string; revision: number; eventJson: string;
  status: "pending" | "leased" | "accepted" | "failed"; attempts: number; availableAt: number;
  leaseToken: string | null; leaseUntil: number | null; acceptedAt: number | null; lastError: OutboxError | null;
}>;
export type OutboxLease = OutboxRecord & Readonly<{ status: "leased"; leaseToken: string; leaseUntil: number }>;
export type ClaimOptions = Readonly<{ now: number; leaseMs: number; limit: number; maxAttempts: number; token: string }>;

export interface OutboxStore {
  claim(options: ClaimOptions): Promise<readonly OutboxLease[]>;
  accept(eventId: string, token: string, now: number): Promise<boolean>;
  defer(eventId: string, token: string, now: number, availableAt: number): Promise<boolean>;
  reject(eventId: string, token: string, now: number, error: OutboxError, retryAt: number | null): Promise<boolean>;
  inspect(eventId: string): Promise<OutboxRecord | undefined>;
  hasPending(simulationId: string): Promise<boolean>;
}

export interface OutboxPublisher {
  publish(event: OutboxEvent): Promise<"accepted" | "deferred">;
}

export type DispatchOptions = Readonly<{
  leaseMs: number; batchSize: number; maxAttempts: number; retryBaseMs: number; retryMaxMs: number; deferMs: number;
}>;

export function validateDispatch(options: DispatchOptions): void {
  for (const value of Object.values(options)) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647) throw new Error("Outbox options must be bounded positive integers.");
  }
  if (options.batchSize > 100 || options.maxAttempts > 100 || options.retryBaseMs > options.retryMaxMs) throw new Error("Invalid outbox limits.");
}

export function validateClaim(options: ClaimOptions): void {
  if (!Number.isSafeInteger(options.now) || options.now < 0 || !options.token.trim()) throw new Error("Invalid outbox claim identity/time.");
  if (!Number.isSafeInteger(options.leaseMs) || options.leaseMs <= 0 || !Number.isSafeInteger(options.now + options.leaseMs)) throw new Error("Invalid lease duration.");
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100 || !Number.isInteger(options.maxAttempts) || options.maxAttempts < 1 || options.maxAttempts > 100) throw new Error("Invalid claim limits.");
}
