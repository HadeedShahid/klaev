import "server-only";

import { eq } from "drizzle-orm";

import { PAGE_DEFAULTS, type PageKind } from "@/data/pages";

import { getDb, type Db } from "./db";
import { pages } from "./db/schema";

export type StorePage = { handle: string; kind: PageKind; title: string; description: string; body: string; edited: boolean; updatedAt: Date | null };

const byHandle = new Map(PAGE_DEFAULTS.map((page) => [page.handle, page]));
export const PAGE_HANDLES = PAGE_DEFAULTS.map((page) => page.handle);

// A page as the store shows it: as edited in the admin, or its starting text. Null for any
// handle the store doesn't have.
export async function getPage(handle: string, db?: Db): Promise<StorePage | null> {
  const start = byHandle.get(handle);
  if (!start) return null;
  const [row] = await (db ?? (await getDb())).select().from(pages).where(eq(pages.handle, handle));
  return row
    ? { handle, kind: start.kind, title: row.title, description: row.description, body: row.body, edited: true, updatedAt: row.updatedAt }
    : { ...start, edited: false, updatedAt: null };
}

export async function listPages(db: Db): Promise<StorePage[]> {
  const rows = await db.select().from(pages);
  return PAGE_DEFAULTS.map((start) => {
    const row = rows.find((candidate) => candidate.handle === start.handle);
    return row
      ? { handle: start.handle, kind: start.kind, title: row.title, description: row.description, body: row.body, edited: true, updatedAt: row.updatedAt }
      : { ...start, edited: false, updatedAt: null };
  });
}

export async function savePage(db: Db, handle: string, input: { title: string; description: string; body: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!byHandle.has(handle)) return { ok: false, message: "That page isn't one the store has." };
  const title = input.title.trim();
  const description = input.description.trim();
  const body = input.body.trim();
  if (!title || title.length > 120) return { ok: false, message: "Give the page a title." };
  if (!body) return { ok: false, message: "The page needs some words." };
  if (description.length > 320) return { ok: false, message: "Keep the search description to 320 characters." };
  if (/[–—]/.test(title + description + body)) return { ok: false, message: "Use a comma or a full stop instead of a dash." };
  const values = { title, description, body, updatedAt: new Date() };
  await db.insert(pages).values({ handle, ...values }).onConflictDoUpdate({ target: pages.handle, set: values });
  return { ok: true };
}

// Back to the starting text.
export async function restorePage(db: Db, handle: string) {
  await db.delete(pages).where(eq(pages.handle, handle));
}
