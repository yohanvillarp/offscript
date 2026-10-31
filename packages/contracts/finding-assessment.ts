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
    new Set([investigation.requestedBy, ...lifecycle.agentIds, lifecycle.completedBy]),
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

  // Outcome is "supported": apply strict verification and independent corroboration criteria.

  // 1. Evidence presence: conclusion must cite positive supporting evidence.
  if (evidenceIds.length === 0) {
    return Object.freeze({
      investigationId: investigation.id,
      hypothesis: investigation.hypothesis,
      outcome,
      confidence: "provisional" as const,
      explanation,
      isConfirmedFinding: false,
      participatingAgents: Object.freeze(participants),
      evidenceIds: Object.freeze([]),
      uncertaintyReason:
        "Provisional assessment: supported conclusion does not reference any supporting evidence.",
    });
  }

  // 2. Observations presence: simulation observations must be available.
  const simulationObservations = observations.filter(
    (obs) => obs.simulationId === investigation.simulationId,
  );

  if (simulationObservations.length === 0) {
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
        "Provisional assessment: no simulation observations are available to verify evidence or corroborate findings.",
    });
  }

  // 3. Evidence verification: all cited evidenceIds must exist in observed simulation data.
  const observedEvidenceMap = new Map<string, string>(); // evidenceId -> agentId
  for (const obs of simulationObservations) {
    for (const eid of obs.evidenceIds) {
      observedEvidenceMap.set(eid, obs.agentId);
    }
  }

  const hasUnverifiedEvidence = evidenceIds.some((eid) => !observedEvidenceMap.has(eid));
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

  // 4. Independent corroboration:
  // Requester/assignee counts, roster membership, or completion authorship alone do NOT constitute corroboration.
  // Independent corroboration requires observations contributed by at least two distinct artificial users.
  const observationMap = new Map<string, ObservationSummary>();
  for (const obs of simulationObservations) {
    observationMap.set(obs.id, obs);
  }

  const observingAgents = new Set<string>();
  for (const obsId of investigation.observationIds) {
    const obs = observationMap.get(obsId);
    if (obs) {
      observingAgents.add(obs.agentId);
    }
  }
  for (const eid of evidenceIds) {
    const agentId = observedEvidenceMap.get(eid);
    if (agentId) {
      observingAgents.add(agentId);
    }
  }

  const isCorroboratedByDistinctObservers = observingAgents.size >= 2;

  if (!isCorroboratedByDistinctObservers) {
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
        "Provisional assessment: conclusion was reached without independent collaborator corroboration across distinct observing agents.",
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
