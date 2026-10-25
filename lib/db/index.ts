import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export function connect(database: D1Database) {
  return drizzle(database, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof connect>;

// The async form works everywhere the app runs: requests on the Worker, `next dev`, and static
// generation at build time, where OpenNext reaches the database through Wrangler.
export async function getDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return connect(env.DB);
}
