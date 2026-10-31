import assert from "node:assert/strict";
import { request } from "node:http";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { hostContext } from "../../runtime/tests/host-context.ts";

function http(origin: string, path: string, options: { method?: string; headers?: Record<string, string> } = {}) {
  return new Promise<{ status: number; body: Buffer; headers: Record<string, string | string[] | undefined> }>((resolve, reject) => {
    const pending = request(origin + path, { method: options.method ?? "GET", headers: options.headers ?? {} }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks), headers: response.headers }));
    });
    pending.on("error", reject);
    pending.end();
  });
}

test("evidence endpoint serves visual artifacts securely with path traversal protection", async (t) => {
  const temp = hostContext(t);
  const host = temp.host();
  const origin = await host.start();
  const token = host.credentials().token;
  const auth = { authorization: `Bearer ${token}` };

  const simId = simulationId("sim-evidence-test");
  const evId = "ev-test-123";

  // 1. Unauthenticated requests are rejected
  const unauth = await http(origin, `/api/simulations/${simId}/evidence/${evId}`);
  assert.equal(unauth.status, 401);

  // 2. Path traversal attempts are rejected with 400
  const traversal1 = await http(origin, `/api/simulations/${simId}/evidence/..%2fsecret`, { headers: auth });
  assert.equal(traversal1.status, 400);

  // 3. Non-existent evidence returns 404
  const notFound = await http(origin, `/api/simulations/${simId}/evidence/nonexistent-evidence`, { headers: auth });
  assert.equal(notFound.status, 404);

  // 4. Save evidence directly via host storage / evidence store and fetch via HTTP
  const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
  const evidenceStore = (host as unknown as { config: { dataDirectory: string } }).config?.dataDirectory;
  if (evidenceStore) {
    const { createEvidenceStore } = await import("../../runtime/evidence-store.ts");
    const store = createEvidenceStore(evidenceStore);
    await store.saveEvidence(simId, evId, fakePng);

    const res = await http(origin, `/api/simulations/${simId}/evidence/${evId}`, { headers: auth });
    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "image/png");
    assert.deepEqual(res.body, fakePng);

    // Verify deletion cleans up
    await store.deleteSimulationEvidence(simId);
    const postDelete = await http(origin, `/api/simulations/${simId}/evidence/${evId}`, { headers: auth });
    assert.equal(postDelete.status, 404);
  }

  await host.close();
});
