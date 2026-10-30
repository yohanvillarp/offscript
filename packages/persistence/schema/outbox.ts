import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { investigations } from "./investigations.ts";

export const outbox = sqliteTable("event_outbox", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }),
  eventId: text("event_id").notNull().unique(),
  simulationId: text("simulation_id").notNull(),
  investigationId: text("investigation_id").notNull(),
  revision: integer("revision").notNull(),
  eventJson: text("event_json").notNull(),
  status: text("status", { enum: ["pending", "leased", "accepted", "failed"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: integer("available_at").notNull().default(0),
  leaseToken: text("lease_token"), leaseUntil: integer("lease_until"), acceptedAt: integer("accepted_at"),
  lastError: text("last_error", { enum: ["PUBLISH_REJECTED", "INVALID_EVENT", "ATTEMPTS_EXHAUSTED"] }),
}, (table) => [
  foreignKey({ columns: [table.investigationId, table.simulationId], foreignColumns: [investigations.id, investigations.simulationId] }),
  unique("outbox_investigation_revision").on(table.investigationId, table.revision),
  index("outbox_ready").on(table.status, table.availableAt, table.sequence),
  index("outbox_aggregate_order").on(table.investigationId, table.sequence, table.status),
  check("outbox_json", sql`json_valid(${table.eventJson})`),
  check("outbox_numbers", sql`${table.revision} >= 0 and ${table.attempts} >= 0 and ${table.availableAt} >= 0`),
  check("outbox_status", sql`${table.status} in ('pending','leased','accepted','failed')`),
  check("outbox_lease", sql`(${table.status} = 'leased' and ${table.leaseToken} is not null and ${table.leaseUntil} is not null) or (${table.status} != 'leased' and ${table.leaseToken} is null and ${table.leaseUntil} is null)`),
  check("outbox_acceptance", sql`(${table.status} = 'accepted' and ${table.acceptedAt} is not null) or (${table.status} != 'accepted' and ${table.acceptedAt} is null)`),
]);
