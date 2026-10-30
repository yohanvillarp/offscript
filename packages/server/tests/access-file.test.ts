import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { storage } from "../../persistence/tests/fixtures.ts";
import { createHostAccessFile } from "../../../scripts/server/access-file.ts";

test("access files have unique paths, preserve explicit credentials, and remove idempotently", t => {
  const temp = storage(t); const credentials = { origin: "http://127.0.0.1:4317", token: "a".repeat(43) };
  const first = createHostAccessFile(temp.root, credentials); const second = createHostAccessFile(temp.root, credentials);
  assert.notEqual(first.path, second.path);
  assert.deepEqual(JSON.parse(readFileSync(first.path, "utf8")), credentials);
  if (process.platform !== "win32") assert.equal(statSync(first.path).mode & 0o777, 0o600);
  first.remove(); first.remove(); assert.equal(existsSync(first.path), false);
  assert.equal(existsSync(second.path), true); second.remove();
});

test("cleanup never deletes an access file whose contents have changed", t => {
  const temp = storage(t);
  const file = createHostAccessFile(temp.root, { origin: "http://127.0.0.1:4317", token: "a".repeat(43) });
  writeFileSync(file.path, "changed by another operation");
  assert.throws(() => file.remove(), /preserved/); assert.equal(existsSync(file.path), true);
});
