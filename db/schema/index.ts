// Drizzle needs the whole schema as one object, for drizzle() in db/index.ts
// and for drizzle-kit. App code imports tables from their own files instead.
//
// Every table calls .enableRLS() with no policies. The app reads and writes
// through Drizzle as the table owner, which bypasses RLS, while Supabase's
// public REST API gets nothing. See AGENTS.md.

export * from "./collections";
export * from "./products";
export * from "./relations";
