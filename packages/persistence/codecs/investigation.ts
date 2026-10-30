import { asc, eq } from "drizzle-orm";
import { parseInvestigationSummary } from "../../contracts/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { investigations, investigationAgents, investigationObservations } from "../schema/index.ts";
import { PersistenceError } from "../errors.ts";
import { json, stored } from "./values.ts";

type RepositoryDatabase = Pick<PersistenceDatabase, "select">;

export function readInvestigation(db: RepositoryDatabase, id: string) {
  const row = db.select().from(investigations).where(eq(investigations.id, id)).get();
  if (!row) return undefined;
  const links = db.select().from(investigationObservations).where(eq(investigationObservations.investigationId, id)).orderBy(asc(investigationObservations.position)).all();
  const agents = db.select().from(investigationAgents).where(eq(investigationAgents.investigationId, id)).orderBy(asc(investigationAgents.position)).all();
  return stored(() => {
    if (links.some((link) => link.simulationId !== row.simulationId) || agents.some((agent) => agent.simulationId !== row.simulationId)) {
      throw new PersistenceError("INVALID_STORED_DATA", "Investigation links cross simulation scope.");
    }
    if (row.status === "requested" && agents.length) throw new PersistenceError("INVALID_STORED_DATA", "Requested investigation has assignees.");
    const lifecycle = row.status === "requested" ? { status: row.status } : {
      status: row.status, agentIds: agents.map((agent) => agent.agentId), assignedAt: row.assignedAt,
      ...(row.status === "completed" ? { completedAt: row.completedAt, completedBy: row.completedBy, result: row.result === null ? null : json(row.result) } : {}),
    };
    const investigation = parseInvestigationSummary({
      id: row.id, simulationId: row.simulationId, requestedBy: row.requestedBy, hypothesis: row.hypothesis,
      requestedAt: row.requestedAt, observationIds: links.map((link) => link.observationId), lifecycle,
    });
    if (!Number.isSafeInteger(row.revision) || row.revision < 0) throw new PersistenceError("INVALID_STORED_DATA", "Invalid storage revision.");
    return Object.freeze({ investigation, revision: row.revision });
  });
}
