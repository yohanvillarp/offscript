import { DomainError, nonBlank } from "./errors.ts";
import { evidenceId } from "./identity.ts";
import type { EvidenceId } from "./identity.ts";

export type InvestigationOutcome = "supported" | "contradicted" | "inconclusive";

// Assessment of a hypothesis, not a verified defect or authorization decision.
export type InvestigationResult = Readonly<{
  outcome: InvestigationOutcome;
  explanation: string;
  evidenceIds: readonly EvidenceId[];
}>;

export function createInvestigationResult(input: InvestigationResult): InvestigationResult {
  if (!["supported", "contradicted", "inconclusive"].includes(input.outcome)) {
    throw new DomainError("INVALID_VALUE", "Unknown investigation outcome.");
  }
  const evidenceIds = input.evidenceIds.map(evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new DomainError("INVALID_VALUE", "Result evidence references must be unique.");
  }
  if (input.outcome !== "inconclusive" && evidenceIds.length === 0) {
    throw new DomainError("INVALID_VALUE", "A supported or contradicted hypothesis requires evidence references.");
  }
  return Object.freeze({
    outcome: input.outcome,
    explanation: nonBlank(input.explanation, "Result explanation"),
    evidenceIds: Object.freeze(evidenceIds),
  });
}
