import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes SQL migrations into drizzle/. Wrangler applies them to D1
// (`pnpm db:migrate` locally, `pnpm db:migrate:remote` for the real database).
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
});
