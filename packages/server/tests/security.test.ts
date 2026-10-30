import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalServer } from "../index.ts";

const token = "a".repeat(43);
const headers = { host: "127.0.0.1:4317", authorization: `Bearer ${token}` };

test("all routes require bearer authentication and never accept tokens in query strings", async t => {
  const server = createLocalServer({ token, port: () => 4317, allowedOrigins: [], phase: () => "ready" });
  t.after(() => server.close());
  for (const url of ["/health/live", "/health/ready", "/missing", `/health/live?token=${token}`]) {
    for (const authorization of [undefined, "", "Basic abc", `Bearer ${"b".repeat(43)}`, `Bearer ${token} extra`]) {
      const response = await server.inject({ url, headers: { host: headers.host, ...(authorization === undefined ? {} : { authorization }) } });
      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.json(), { error: "UNAUTHORIZED" });
      assert.equal(response.headers["www-authenticate"], "Bearer");
      assert.ok(!response.body.includes(token));
    }
  }
});

test("Host checks reject rebinding, forwarded hosts, unexpected ports, and malformed authorities", async t => {
  const server = createLocalServer({ token, port: () => 4317, allowedOrigins: [], phase: () => "ready" });
  t.after(() => server.close());
  for (const host of ["evil.test:4317", "127.0.0.1:9999", "127.0.0.1", "localhost.evil.test:4317", "user@127.0.0.1:4317", "[::1]:4317"]) {
    const response = await server.inject({ url: "/health/live", headers: { ...headers, host, "x-forwarded-host": headers.host } });
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), { error: "HOST_NOT_ALLOWED" });
  }
  const allowed = await server.inject({ url: "/health/live", headers: { ...headers, host: "localhost:4317" } });
  assert.equal(allowed.statusCode, 200);
});

test("origin checks deny foreign and null origins without enabling CORS", async t => {
  const server = createLocalServer({ token, port: () => 4317, allowedOrigins: ["http://localhost:5173"], phase: () => "ready" });
  t.after(() => server.close());
  for (const origin of ["https://evil.test", "null", "http://localhost:5173.evil.test", "http://127.0.0.1:9999"]) {
    const response = await server.inject({ url: "/health/live", headers: { ...headers, origin } });
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), { error: "ORIGIN_NOT_ALLOWED" });
  }
  const crossSite = await server.inject({ url: "/health/live", headers: { ...headers, "sec-fetch-site": "cross-site" } });
  assert.equal(crossSite.statusCode, 403);
  for (const origin of ["http://127.0.0.1:4317", "http://localhost:5173"]) {
    const response = await server.inject({ url: "/health/live", headers: { ...headers, origin } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
    assert.equal(response.headers["cache-control"], "no-store");
  }
});
