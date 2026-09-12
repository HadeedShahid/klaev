import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  casing: "snake_case",
  schemaFilter: ["public"],
  dbCredentials: {
    // Session pooler: migrations need the prepared statements 6543 lacks.
    url: url.replace(":6543/", ":5432/"),
  },
});
