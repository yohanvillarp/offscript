import { and, eq } from "drizzle-orm";
import { assignInvestigation } from "../../domain/index.ts";
import { parseInvestigationSummary } from "../../contracts/index.ts";
import type { RequestedInvestigation, AssignedInvestigation } from "../../domain/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { investigations, investigationAgents, investigationObservations } from "../schema/index.ts";
import { readInvestigation } from "../codecs/investigation.ts";
import { PersistenceError } from "../errors.ts";

type WriteDatabase = Pick<PersistenceDatabase, "select" | "insert" | "update" | "delete">;

export function writeRequest(tx: WriteDatabase, input: RequestedInvestigation): "created" | "already-exists" {
  const value = parseInvestigationSummary(input);
  if (value.lifecycle.status !== "requested") throw new PersistenceError("INVALID_WRITE", "Expected requested investigation.");

  const result = tx.insert(investigations).values({
    id: value.id, simulationId: value.simulationId, requestedBy: value.requestedBy,
    hypothesis: value.hypothesis, requestedAt: value.requestedAt, status: "requested", revision: 0,
  }).onConflictDoNothing({ target: investigations.id }).run();
  if (!result.changes) return "already-exists";
  tx.insert(investigationObservations).values(value.observationIds.map((id, position) => ({
    investigationId: value.id, simulationId: value.simulationId, observationId: id, position,
  }))).run();
  return "created";
}

export function writeAssignment(tx: WriteDatabase, input: AssignedInvestigation, expectedRevision: number): "saved" | "conflict" | "not-found" {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision === Number.MAX_SAFE_INTEGER) throw new PersistenceError("INVALID_WRITE", "Invalid revision.");
  const value = parseInvestigationSummary(input);
  if (value.lifecycle.status !== "assigned") throw new PersistenceError("INVALID_WRITE", "Expected assigned investigation.");
  const lifecycle = value.lifecycle;

  const current = readInvestigation(tx, value.id);
  if (!current) return "not-found";
  if (current.revision !== expectedRevision) return "conflict";
  const existing = current.investigation.lifecycle.status === "requested" ? [] : current.investigation.lifecycle.agentIds;
  const expected = assignInvestigation(current.investigation, lifecycle.agentIds.filter((id) => !existing.includes(id)), lifecycle.assignedAt);
  if (JSON.stringify(parseInvestigationSummary(expected)) !== JSON.stringify(value)) {
    throw new PersistenceError("INVALID_WRITE", "Assignment must preserve the investigation and existing collaborators.");
  }
  const result = tx.update(investigations).set({ status: "assigned", assignedAt: lifecycle.assignedAt, revision: expectedRevision + 1 })
    .where(and(eq(investigations.id, value.id), eq(investigations.revision, expectedRevision))).run();
  if (!result.changes) return "conflict";
  tx.delete(investigationAgents).where(eq(investigationAgents.investigationId, value.id)).run();
  tx.insert(investigationAgents).values(lifecycle.agentIds.map((id, position) => ({
    investigationId: value.id, simulationId: value.simulationId, agentId: id, position,
  }))).run();
  return "saved";
}
