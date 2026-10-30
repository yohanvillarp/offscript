import { sql } from "drizzle-orm";
import { check, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const simulations = sqliteTable("simulations", {
  id: text("id").primaryKey(),
  environment: text("environment").notNull(),
  deployment: text("deployment").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
}, (table) => [
  check("simulation_environment", sql`${table.environment} = 'web'`),
  check("simulation_deployment", sql`${table.deployment} in ('local','development','test','staging','production')`),
  check("simulation_status", sql`${table.status} in ('created','running','completed','failed','cancelled')`),
  check("simulation_reason", sql`(${table.status} = 'failed' and ${table.reason} is not null and length(trim(${table.reason})) > 0) or (${table.status} != 'failed' and ${table.reason} is null)`),
]);

export const agents = sqliteTable("agents", {
  simulationId: text("simulation_id").notNull().references(() => simulations.id),
  id: text("id").notNull(),
  position: integer("position").notNull(),
  profile: text("profile").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
}, (table) => [
  primaryKey({ columns: [table.simulationId, table.id] }),
  unique("agent_position").on(table.simulationId, table.position),
  check("agent_nonnegative_position", sql`${table.position} >= 0`),
  check("agent_profile_json", sql`json_valid(${table.profile})`),
  check("agent_status", sql`${table.status} in ('ready','running','completed','failed','cancelled')`),
  check("agent_reason", sql`(${table.status} = 'failed' and ${table.reason} is not null and length(trim(${table.reason})) > 0) or (${table.status} != 'failed' and ${table.reason} is null)`),
]);
