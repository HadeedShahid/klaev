import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { getPlatformProxy } from "wrangler";

import { connect } from ".";

// For Vitest only: a throwaway in-memory D1 (and R2), built by Wrangler exactly like the real ones,
// with every migration in drizzle/ applied.
export async function createTestDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database; RECEIPTS: R2Bucket }>({ persist: false });
  const database = proxy.env.DB;

  const migrations = path.join(process.cwd(), "drizzle");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    const statements = readFileSync(path.join(migrations, file), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    await database.batch(statements.map((statement) => database.prepare(statement)));
  }

  return {
    env: proxy.env,
    database,
    db: connect(database),
    run: (statements: string[]) => database.batch(statements.map((statement) => database.prepare(statement))),
    dispose: () => proxy.dispose(),
  };
}
