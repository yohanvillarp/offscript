import { randomUUID } from "node:crypto";
import { dispatchOutboxBatch, validateDispatch } from "../application/index.ts";
import type { DispatchOptions, OutboxStore, OutboxPublisher } from "../application/index.ts";

export type OutboxDispatcherOptions = Readonly<{
  store: OutboxStore; publisher: OutboxPublisher; dispatch?: DispatchOptions;
  pollMs?: number; publishTimeoutMs?: number; now?: () => number; token?: () => string;
  onError?: (cause: unknown) => void;
}>;

export function createOutboxDispatcher(options: OutboxDispatcherOptions) {
  const dispatch = Object.freeze({ ...(options.dispatch ?? { leaseMs: 30_000, batchSize: 10, maxAttempts: 5, retryBaseMs: 100, retryMaxMs: 10_000, deferMs: 250 }) });
  validateDispatch(dispatch);
  const timeout = options.publishTimeoutMs ?? Math.min(5_000, dispatch.leaseMs - 1);
  const pollMs = options.pollMs ?? 25;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout >= dispatch.leaseMs || !Number.isSafeInteger(pollMs) || pollMs < 1 || pollMs > 2_147_483_647) throw new Error("Invalid dispatcher timing.");
  const publisher: OutboxPublisher = {
    async publish(event) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([Promise.resolve().then(() => options.publisher.publish(event)),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Outbox publication timed out.")), timeout); })]);
      } finally { clearTimeout(timer); }
    },
  };
  let running: ReturnType<typeof dispatchOutboxBatch> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let started = false;
  let stopped = false;
  function runOnce() {
    if (stopped) return Promise.reject(new Error("Dispatcher is stopped."));
    if (running) return running;
    running = dispatchOutboxBatch({ store: options.store, publisher, now: options.now ?? Date.now, token: options.token ?? randomUUID }, dispatch)
      .finally(() => { running = undefined; });
    return running;
  }
  async function tick() {
    try { await runOnce(); } catch (cause) {
      try { options.onError?.(cause); } catch { stopped = true; }
    }
    finally { if (!stopped) { timer = setTimeout(() => { void tick(); }, pollMs); timer.unref(); } }
  }
  return Object.freeze({ runOnce,
    start() { if (!started && !stopped) { started = true; void tick(); } },
    async stop() { stopped = true; clearTimeout(timer); await running; },
  });
}
