import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/constants/env.server";

import * as schema from "./schema";

// Reuse one client across hot reloads in development so each edit doesn't
// open a new pool against Supabase's connection limit.
const globalForDb = globalThis as unknown as { dbClient?: postgres.Sql };

// The transaction pooler (port 6543) doesn't support prepared statements.
const client =
  globalForDb.dbClient ?? postgres(env.DATABASE_URL, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.dbClient = client;

export const db = drizzle({ client, schema, casing: "snake_case" });
