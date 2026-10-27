import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import type { Db } from "../db";
import { collections, products } from "../db/schema";
import type { Result } from "./orders";
import { slugify } from "./products";

const fail = (message: string) => ({ ok: false as const, message });

// Collections in the order the store shows them, each with how many products it holds.
export async function listCollectionsWithCounts(db: Db) {
  return db
    .select({
      handle: collections.handle,
      title: collections.title,
      position: collections.position,
      products: sql<number>`(SELECT COUNT(*) FROM products WHERE products.collection_handle = collections.handle AND products.status != 'archived')`,
    })
    .from(collections)
    .orderBy(asc(collections.position), asc(collections.handle));
}

// A new collection at the end. Its handle, the address /collections/<handle>, comes from the title.
export async function createCollection(db: Db, title: string): Promise<Result> {
  const name = title.trim();
  if (!name || name.length > 80) return fail("Give the collection a name.");
  const handle = slugify(name);
  if (!handle) return fail("The name needs at least one letter or number.");
  if (handle === "all") return fail("\"All\" is already the whole store's collection.");
  const [taken] = await db.select({ handle: collections.handle }).from(collections).where(eq(collections.handle, handle));
  if (taken) return fail("There's already a collection with that name.");
  await db.insert(collections).values({ handle, title: name, position: sql`(SELECT COALESCE(MAX(position), 0) + 1 FROM collections)` });
  return { ok: true };
}

// Renames what shoppers see; the address stays, so links keep working.
export async function renameCollection(db: Db, handle: string, title: string): Promise<Result> {
  const name = title.trim();
  if (!name || name.length > 80) return fail("Give the collection a name.");
  const updated = await db.update(collections).set({ title: name }).where(eq(collections.handle, handle)).returning({ handle: collections.handle });
  return updated.length ? { ok: true } : fail("That collection isn't there any more.");
}

export async function moveCollection(db: Db, handle: string, direction: -1 | 1): Promise<Result> {
  const rows = await listCollectionsWithCounts(db);
  const index = rows.findIndex((row) => row.handle === handle);
  const target = index + direction;
  if (index < 0) return fail("That collection isn't there any more.");
  if (target < 0 || target >= rows.length) return { ok: true };
  const order = rows.map((row) => row.handle);
  [order[index], order[target]] = [order[target], order[index]];
  const [first, ...rest] = order.map((key, position) => db.update(collections).set({ position }).where(eq(collections.handle, key)));
  await db.batch([first, ...rest]);
  return { ok: true };
}

// Only an empty collection can go; products move to another collection from their own page first.
export async function deleteCollection(db: Db, handle: string): Promise<Result> {
  const [used] = await db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.collectionHandle, handle));
  if (used.count > 0) return fail(`It still holds ${used.count} ${used.count === 1 ? "product" : "products"}. Move them to another collection first.`);
  await db.delete(collections).where(eq(collections.handle, handle));
  return { ok: true };
}
