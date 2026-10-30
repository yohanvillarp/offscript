import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./packages/persistence/schema/index.ts",
  out: "./packages/persistence/migrations",
});
