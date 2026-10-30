import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { request } from "node:http";
import { test } from "node:test";
import { join } from "node:path";
import { createLocalHost } from "../host.ts";
import { fixture, seed } from "../../persistence/tests/fixtures.ts";
import { hostContext, eventually } from "./host-context.ts";
import { assignmentEvent } from "../../persistence/tests/outbox-fixtures.ts";

async function get(origin: string, token?: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const pending = request(`${origin}/health/ready`, { headers: token ? { authorization: `Bearer ${token}` } : {} }, response => {
      let body = ""; response.setEncoding("utf8"); response.on("data", (chunk: string) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
    });
    pending.on("error", reject); pending.end();
  });
}

test("real loopback listener authenticates, closes idempotently, preserves data, and rotates credentials", async t => {
  const temp = hostContext(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const host = temp.host();
  assert.throws(() => host.credentials(), /not ready/);
  const start = host.start(); assert.equal(host.start(), start);
  const origin = await start; const credentials = host.credentials();
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.deepEqual(await get(origin, credentials.token), { status: 200, body: '{"status":"ready"}' });
  assert.equal((await get(origin)).status, 401);
  const close = host.close(); assert.equal(host.close(), close); await close;
  assert.equal(host.phase(), "stopped"); await assert.rejects(get(origin)); await assert.rejects(host.start());
  assert.deepEqual((await db.investigations.findInvestigation(source.investigation.id))?.investigation, source.investigation);
  const second = temp.host(); await second.start();
  assert.notEqual(second.credentials().token, credentials.token);
  assert.equal((await get(second.credentials().origin, credentials.token)).status, 401);
});

test("stored events defer without preparing agents and dispatch only to explicitly registered sessions", async t => {
  const temp = hostContext(t); const db = temp.open(); db.migrate();
  const first = await seed(db); const second = await seed(db, fixture("second"));
  const events = [assignmentEvent(first, "first-event"), assignmentEvent(second, "second-event")];
  for (const event of events) await db.investigations.commitAssignment(event, 0);
  const host = temp.host(); await host.start();
  await eventually(async () => (await db.outbox.inspect("first-event"))?.status === "pending");
  assert.equal((await db.outbox.inspect("first-event"))?.attempts, 0);
  const published: string[] = []; let closed = 0; let constructed = 0;
  for (const source of [first, second]) {
    host.prepareSession(source.simulation.id, context => {
      constructed++; assert.equal(context.outboxMode, "external");
      return { canAcceptEvent: event => event.simulationId === source.simulation.id,
        publishEvent(event) { published.push(event.eventId); }, async close() { closed++; } };
    });
  }
  assert.throws(() => host.prepareSession(first.simulation.id, () => { throw new Error("Must not construct duplicate"); }), /already has/);
  assert.equal(constructed, 2);
  await eventually(async () => (await db.outbox.inspect("first-event"))?.status === "accepted" && (await db.outbox.inspect("second-event"))?.status === "accepted");
  assert.deepEqual(published, ["first-event", "second-event"]);
  await host.close(); assert.equal(closed, 2);
});

test("failed listening startup rolls back resources without damaging existing SQLite data", async t => {
  const temp = hostContext(t); const db = temp.open(); db.migrate(); const source = await seed(db);
  const first = temp.host();
  const origin = await first.start(); const port = Number(new URL(origin).port);
  const competing = temp.host({ port });
  await assert.rejects(competing.start(), /startup failed/);
  assert.equal(competing.phase(), "stopped"); await competing.close();
  assert.deepEqual((await db.investigations.findInvestigation(source.investigation.id))?.investigation, source.investigation);
});

test("closing before or during startup never leaves a ready host", async t => {
  const temp = hostContext(t);
  const unopened = temp.host(); await unopened.close();
  assert.equal(existsSync(join(temp.root, ".offscript")), false);
  await assert.rejects(unopened.start());
  const host = temp.host(); const starting = host.start();
  const rejected = assert.rejects(starting, /startup failed/);
  await host.close(); await rejected; assert.equal(host.phase(), "stopped");
});

test("configuration errors fail before creating storage", t => {
  const temp = hostContext(t);
  for (const patch of [{ port: -1 }, { port: 65536 }, { port: 1.2 }, { dataDirectory: " " },
    { shutdownTimeoutMs: 0 }, { allowedOrigins: ["null"] }, { allowedOrigins: ["https://example.test/path"] },
    { allowedOrigins: ["https://user:password@example.test"] }]) {
    assert.throws(() => createLocalHost({ projectRoot: temp.root, ...patch }));
  }
  assert.equal(existsSync(join(temp.root, ".offscript")), false);
});
