import assert from "node:assert/strict";
import { test } from "node:test";
import { hasSeenIntroduction, rememberIntroduction } from "../src/pages/new-simulation/model/introduction.ts";

test("a new browser shows the introduction until configuration is entered", () => {
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
  assert.equal(hasSeenIntroduction(storage), false);
  rememberIntroduction(storage);
  assert.equal(hasSeenIntroduction(storage), true);
  assert.equal(values.size, 1);
});

test("blocked browser storage does not prevent entering configuration", () => {
  const blocked = () => { throw new Error("Storage is blocked"); };
  assert.equal(hasSeenIntroduction(blocked), false);
  assert.doesNotThrow(() => rememberIntroduction(blocked));
});

test("an unrelated preference value does not suppress the introduction", () => {
  assert.equal(hasSeenIntroduction(() => ({ getItem: () => "false", setItem: () => {} })), false);
});
