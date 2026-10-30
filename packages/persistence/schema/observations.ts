import { sql } from "drizzle-orm";
import { check, foreignKey, index, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { agents, simulations } from "./simulations.ts";

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  simulationId: text("simulation_id").notNull().references(() => simulations.id),
  agentId: text("agent_id").notNull(),
  observedAt: text("observed_at").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  evidenceIds: text("evidence_ids").notNull(),
}, (table) => [
  unique("observation_scope").on(table.id, table.simulationId),
  foreignKey({ columns: [table.simulationId, table.agentId], foreignColumns: [agents.simulationId, agents.id] }),
  index("observation_simulation_time").on(table.simulationId, table.observedAt, table.id),
  check("observation_evidence_json", sql`json_valid(${table.evidenceIds})`),
]);
