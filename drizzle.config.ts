import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env here. On Vercel and CI the
// variables come from the environment instead. This file can't import
// constants/env.server.ts, which is server-only.
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
    // The app uses the transaction pooler (6543). Migrations use the session
    // pooler (5432) on the same host, which supports prepared statements.
    url: url.replace(":6543/", ":5432/"),
  },
});
