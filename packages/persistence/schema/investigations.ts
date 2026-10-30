import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { agents, simulations } from "./simulations.ts";
import { observations } from "./observations.ts";

export const investigations = sqliteTable("investigations", {
  id: text("id").primaryKey(),
  simulationId: text("simulation_id").notNull().references(() => simulations.id),
  requestedBy: text("requested_by").notNull(),
  hypothesis: text("hypothesis").notNull(),
  requestedAt: text("requested_at").notNull(),
  status: text("status").notNull(),
  assignedAt: text("assigned_at"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
  result: text("result"),
  revision: integer("revision").notNull().default(0),
}, (table) => [
  unique("investigation_scope").on(table.id, table.simulationId),
  foreignKey({ columns: [table.simulationId, table.requestedBy], foreignColumns: [agents.simulationId, agents.id] }),
  foreignKey({ columns: [table.simulationId, table.completedBy], foreignColumns: [agents.simulationId, agents.id] }),
  index("investigation_simulation_status").on(table.simulationId, table.status, table.requestedAt, table.id),
  check("investigation_revision", sql`${table.revision} >= 0 and ${table.revision} <= 9007199254740991`),
  check("investigation_state", sql`(
    (${table.status} = 'requested' and ${table.assignedAt} is null and ${table.completedAt} is null and ${table.completedBy} is null and ${table.result} is null)
    or (${table.status} = 'assigned' and ${table.assignedAt} is not null and ${table.completedAt} is null and ${table.completedBy} is null and ${table.result} is null)
    or (${table.status} = 'completed' and ${table.assignedAt} is not null and ${table.completedAt} is not null and ${table.completedBy} is not null and ${table.result} is not null)
  )`),
  check("investigation_result_json", sql`${table.result} is null or json_valid(${table.result})`),
]);

export const investigationObservations = sqliteTable("investigation_observations", {
  investigationId: text("investigation_id").notNull(),
  simulationId: text("simulation_id").notNull(),
  observationId: text("observation_id").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.investigationId, table.observationId] }),
  unique("investigation_observation_position").on(table.investigationId, table.position),
  foreignKey({ columns: [table.investigationId, table.simulationId], foreignColumns: [investigations.id, investigations.simulationId] }),
  foreignKey({ columns: [table.observationId, table.simulationId], foreignColumns: [observations.id, observations.simulationId] }),
  check("investigation_observation_nonnegative_position", sql`${table.position} >= 0`),
]);

export const investigationAgents = sqliteTable("investigation_agents", {
  investigationId: text("investigation_id").notNull(),
  simulationId: text("simulation_id").notNull(),
  agentId: text("agent_id").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.investigationId, table.agentId] }),
  unique("investigation_agent_position").on(table.investigationId, table.position),
  foreignKey({ columns: [table.investigationId, table.simulationId], foreignColumns: [investigations.id, investigations.simulationId] }),
  foreignKey({ columns: [table.simulationId, table.agentId], foreignColumns: [agents.simulationId, agents.id] }),
  check("investigation_agent_nonnegative_position", sql`${table.position} >= 0`),
]);
