import assert from "node:assert/strict";
import { test } from "node:test";
import { validateParticipants, validateTarget } from "../src/pages/new-simulation/model/validation.ts";
import type { SimulationDraft } from "../src/pages/new-simulation/model/draft.ts";

const draft: SimulationDraft = {
  name: "Checkout exploration", url: "http://localhost:3000", environment: "local",
  goal: "Find a product and complete a purchase.",
  participants: [{ id: "raven", name: "Raven" }],
};

test("accepts a local application without contacting it", () => {
  assert.deepEqual(validateTarget(draft), {});
});

test("accepts HTTPS and trims surrounding field whitespace without mutating input", () => {
  const input = { ...draft, name: "  Checkout  ", url: " https://app.example.test/checkout " };
  assert.deepEqual(validateTarget(input), {});
  assert.equal(input.name, "  Checkout  ");
  assert.equal(input.url, " https://app.example.test/checkout ");
});

for (const url of ["", " ", "/checkout", "localhost:3000", "http:/localhost", "https:app.example.test",
  "ftp://app.example.test", "javascript:alert(1)", "https://", "https://user:secret@app.example.test", "http://user@app.example.test"]) {
  test(`rejects invalid or credential-bearing target: ${url}`, () => {
    assert.equal(typeof validateTarget({ ...draft, url }).url, "string");
  });
}

test("validates required target fields together", () => {
  assert.deepEqual(Object.keys(validateTarget({ ...draft, name: " ", url: "" })), ["name", "url"]);
});

test("requires at least one participant", () => {
  assert.equal(typeof validateParticipants({ ...draft, participants: [] }).participants, "string");
});

test("requires a nonblank shared exploration goal", () => {
  for (const goal of ["", " ", "\n\t"]) {
    assert.deepEqual(Object.keys(validateTarget({ ...draft, goal })), ["goal"]);
  }
});

test("accepts a multiline goal without rewriting the user's intent", () => {
  const input = Object.freeze({ ...draft, goal: "  Find a product.\nComplete a purchase.  " });
  assert.deepEqual(validateTarget(input), {});
  assert.equal(input.goal, "  Find a product.\nComplete a purchase.  ");
});

test("accepts multiple selected visual identities without requiring profile configuration", () => {
  const input = Object.freeze({ ...draft, participants: Object.freeze([
    Object.freeze({ id: "raven", name: "Raven" }),
    Object.freeze({ id: "fox", name: "Fox" }),
    Object.freeze({ id: "compass", name: "Compass" }),
  ]) });
  assert.deepEqual(validateParticipants(input), {});
  assert.equal(input.participants.length, 3);
});
