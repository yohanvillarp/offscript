import { sql } from "drizzle-orm";
import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { simulations } from "./simulations.ts";

export const simulationConfigurations = sqliteTable("simulation_configurations", {
  simulationId: text("simulation_id").primaryKey().references(() => simulations.id),
  configuration: text("configuration").notNull(),
}, table => [
  check("configuration_json", sql`json_valid(${table.configuration}) and json_type(${table.configuration}) = 'object'`),
  check("configuration_identity", sql`json_type(${table.configuration}, '$.simulationId') is 'text' and json_extract(${table.configuration}, '$.simulationId') = ${table.simulationId}`),
]);
