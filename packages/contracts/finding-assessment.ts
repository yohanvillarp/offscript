import type { InvestigationSummary } from "./investigation-summary.ts";
import type { ObservationSummary } from "./observation-summary.ts";

export type FindingConfidence =
  | "provisional"
  | "corroborated"
  | "inconclusive"
  | "refuted";

export type FindingAssessment = Readonly<{
  investigationId: string;
  hypothesis: string;
  outcome: "supported" | "contradicted" | "inconclusive";
  confidence: FindingConfidence;
  explanation: string;
  isConfirmedFinding: boolean;
  participatingAgents: readonly string[];
  evidenceIds: readonly string[];
  uncertaintyReason?: string | undefined;
}>;

export type CompletedInvestigationSummary = InvestigationSummary & {
  readonly lifecycle: {
    readonly status: "completed";
    readonly agentIds: readonly string[];
    readonly assignedAt: string;
    readonly completedAt: string;
    readonly completedBy: string;
    readonly result: {
      readonly outcome: "supported" | "contradicted" | "inconclusive";
      readonly explanation: string;
      readonly evidenceIds: readonly string[];
    };
  };
};

export function evaluateFindingAssessment(
  investigation: CompletedInvestigationSummary,
  observations: readonly ObservationSummary[] = [],
): FindingAssessment {
  const lifecycle = investigation.lifecycle;
  const outcome = lifecycle.result.outcome;
  const explanation = lifecycle.result.explanation;
  const evidenceIds = lifecycle.result.evidenceIds;

  const participants = Array.from(
    new Set([investigation.requestedBy, ...lifecycle.agentIds]),
  );

  if (outcome === "inconclusive") {
    return Object.freeze({
      investigationId: investigation.id,
      hypothesis: investigation.hypothesis,
      outcome,
      confidence: "inconclusive" as const,
      explanation,
      isConfirmedFinding: false,
      participatingAgents: Object.freeze(participants),
      evidenceIds: Object.freeze([...evidenceIds]),
      uncertaintyReason:
        "Investigation did not establish either a supporting or contradictory conclusion.",
    });
  }

  if (outcome === "contradicted") {
    return Object.freeze({
      investigationId: investigation.id,
      hypothesis: investigation.hypothesis,
      outcome,
      confidence: "refuted" as const,
      explanation,
      isConfirmedFinding: false,
      participatingAgents: Object.freeze(participants),
      evidenceIds: Object.freeze([...evidenceIds]),
      uncertaintyReason:
        "The hypothesis was contradicted by investigative assessment.",
    });
  }

  // Outcome is "supported": apply explicit confirmation criteria.
  // 1. Corroboration: must involve at least 2 distinct artificial users
  // (e.g. requester != completer, or multiple assigned agents).
  const isCorroboratedByCollaborators =
    participants.length >= 2 &&
    (investigation.requestedBy !== lifecycle.completedBy ||
      lifecycle.agentIds.length >= 2);

  // 2. Evidence validation: if simulation observations are provided, check
  // that all cited evidenceIds originate from known observations in this simulation.
  const observedEvidence = new Set<string>();
  for (const obs of observations) {
    if (obs.simulationId === investigation.simulationId) {
      for (const eid of obs.evidenceIds) {
        observedEvidence.add(eid);
      }
    }
  }

  const hasUnverifiedEvidence =
    observations.length > 0 &&
    evidenceIds.some((eid) => !observedEvidence.has(eid));

  if (!isCorroboratedByCollaborators) {
    return Object.freeze({
      investigationId: investigation.id,
      hypothesis: investigation.hypothesis,
      outcome,
      confidence: "provisional" as const,
      explanation,
      isConfirmedFinding: false,
      participatingAgents: Object.freeze(participants),
      evidenceIds: Object.freeze([...evidenceIds]),
      uncertaintyReason:
        "Provisional assessment: conclusion was reached without independent collaborator corroboration.",
    });
  }

  if (hasUnverifiedEvidence) {
    return Object.freeze({
      investigationId: investigation.id,
      hypothesis: investigation.hypothesis,
      outcome,
      confidence: "provisional" as const,
      explanation,
      isConfirmedFinding: false,
      participatingAgents: Object.freeze(participants),
      evidenceIds: Object.freeze([...evidenceIds]),
      uncertaintyReason:
        "Provisional assessment: one or more referenced evidence identifiers are unverified in observed simulation data.",
    });
  }

  return Object.freeze({
    investigationId: investigation.id,
    hypothesis: investigation.hypothesis,
    outcome,
    confidence: "corroborated" as const,
    explanation,
    isConfirmedFinding: true,
    participatingAgents: Object.freeze(participants),
    evidenceIds: Object.freeze([...evidenceIds]),
  });
}
