import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalServer } from "../index.ts";
import type { HostPhase } from "../index.ts";

const token = "a".repeat(43);
const headers = { host: "localhost:4317", authorization: `Bearer ${token}` };

test("health distinguishes liveness from readiness and serializes minimal responses", async t => {
  let phase: HostPhase = "starting";
  const server = createLocalServer({ token, port: () => 4317, allowedOrigins: [], phase: () => phase });
  t.after(() => server.close());
  for (const next of ["starting", "ready", "failed", "stopping", "stopped"] as const) {
    phase = next;
    const ready = await server.inject({ url: "/health/ready", headers });
    assert.equal(ready.statusCode, phase === "ready" ? 200 : 503);
    assert.deepEqual(ready.json(), { status: phase === "ready" ? "ready" : "not-ready" });
    const live = await server.inject({ url: "/health/live", headers });
    assert.equal(live.statusCode, 200);
    assert.deepEqual(live.json(), { status: "alive" });
  }
});

test("unknown routes and unexpected failures do not reveal internal messages or request URLs", async t => {
  const server = createLocalServer({ token, port: () => 4317, allowedOrigins: [], phase: () => "ready" });
  server.get("/failure", async () => { throw new Error("secret database path and credentials"); });
  t.after(() => server.close());
  const missing = await server.inject({ url: "/missing?sensitive=value", headers });
  assert.equal(missing.statusCode, 404); assert.deepEqual(missing.json(), { error: "NOT_FOUND" });
  const failure = await server.inject({ url: "/failure", headers });
  assert.equal(failure.statusCode, 500); assert.deepEqual(failure.json(), { error: "INTERNAL_ERROR" });
  const unsupported = await server.inject({ url: "/health/live", method: "POST", headers });
  assert.equal(unsupported.statusCode, 404);
});
