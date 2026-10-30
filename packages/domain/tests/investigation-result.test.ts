import assert from "node:assert/strict";
import { test } from "node:test";
import { createInvestigationResult, DomainError, evidenceId } from "../index.ts";
import type { InvestigationOutcome } from "../index.ts";

for (const outcome of ["supported", "contradicted", "inconclusive"] as const) {
  test(`preserves a ${outcome} hypothesis assessment without claiming a confirmed finding`, () => {
    const evidenceIds = [evidenceId("evidence-1")];
    const result = createInvestigationResult({ outcome, explanation: "Recorded observations explain the outcome.", evidenceIds });
    evidenceIds.push(evidenceId("evidence-2"));
    assert.equal(result.outcome, outcome);
    assert.equal("confirmed" in result, false);
    assert.equal(result.evidenceIds.length, 1);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.evidenceIds));
  });
}

test("allows inconclusive work to finish without collected evidence", () => {
  assert.deepEqual(createInvestigationResult({
    outcome: "inconclusive", explanation: "Could not reproduce the behavior.", evidenceIds: [],
  }).evidenceIds, []);
});

for (const outcome of ["supported", "contradicted"] as const) {
  test(`${outcome} requires evidence references, without certifying those resources`, () => {
    assert.throws(() => createInvestigationResult({ outcome, explanation: "An assertion", evidenceIds: [] }), DomainError);
  });
}

test("rejects empty explanations, duplicate evidence, and unsupported assessments", () => {
  const result = { outcome: "inconclusive" as const, explanation: "No conclusion", evidenceIds: [] };
  assert.throws(() => createInvestigationResult({ ...result, explanation: " " }), DomainError);
  assert.throws(() => createInvestigationResult({ ...result, evidenceIds: [evidenceId("one"), evidenceId("one")] }), DomainError);
  assert.throws(() => createInvestigationResult({ ...result, outcome: "confirmed" as InvestigationOutcome }), DomainError);
});
