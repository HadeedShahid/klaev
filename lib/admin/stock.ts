import "server-only";

import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { Db } from "../db";
import { collections, orders, products, stockChanges, variants, type STOCK_REASONS } from "../db/schema";
import type { Result } from "./orders";

// Every product, drafts too, in shop order, with its sizes and what is free to sell.
export async function listStock(db: Db) {
  const rows = await db.query.products.findMany({
    columns: { id: true, handle: true, title: true, status: true, collectionHandle: true },
    with: {
      variants: { columns: { id: true, size: true, sku: true, stock: true }, orderBy: (rows, { asc }) => asc(rows.position) },
      images: { columns: { src: true, width: true, height: true }, orderBy: (rows, { asc }) => asc(rows.position), limit: 1 },
    },
    orderBy: (rows, { asc }) => asc(rows.position),
  });
  const order = await db.select({ handle: collections.handle }).from(collections).orderBy(asc(collections.position));
  const rank = (handle: string) => order.findIndex((collection) => collection.handle === handle);
  return rows
    .map(({ images, ...product }) => ({ ...product, image: images[0] ?? null }))
    .sort((a, b) => rank(a.collectionHandle) - rank(b.collectionHandle));
}

export const INVENTORY_FILTERS = ["all", "low", "out"] as const;
export type InventoryFilter = (typeof INVENTORY_FILTERS)[number];

// Every size as its own row, in shop order: what's free to sell, and the product it belongs to.
// "low" is a size on its last piece; "out" is sold out. Drafts are included; archived products aren't.
export async function listInventory(db: Db, { filter = "all", query = "" }: { filter?: InventoryFilter; query?: string }) {
  const rows = await db
    .select({
      variantId: variants.id,
      productId: products.id,
      title: products.title,
      status: products.status,
      size: variants.size,
      sku: variants.sku,
      stock: variants.stock,
      image: sql<string | null>`(SELECT src FROM product_images WHERE product_images.product_id = products.id ORDER BY position LIMIT 1)`,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(
      and(
        ne(products.status, "archived"),
        filter === "low" ? eq(variants.stock, 1) : filter === "out" ? eq(variants.stock, 0) : undefined,
        query.trim() ? or(like(products.title, `%${query.trim()}%`), like(variants.sku, `%${query.trim()}%`)) : undefined,
      ),
    )
    .orderBy(asc(products.position), asc(products.id), asc(variants.position));
  return rows;
}

export async function inventoryCounts(db: Db) {
  const [row] = await db
    .select({
      all: sql<number>`COUNT(*)`,
      low: sql<number>`SUM(CASE WHEN ${variants.stock} = 1 THEN 1 ELSE 0 END)`,
      out: sql<number>`SUM(CASE WHEN ${variants.stock} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(ne(products.status, "archived"));
  return { all: row.all, low: row.low ?? 0, out: row.out ?? 0 };
}

export type StockChange = { variantId: number; from: number; to: number };

// One line of stock history, written in the same batch as the change it records. A raw SELECT
// gives every stock_changes column in order: id, variant_id, change, stock_after, reason,
// order_id, note, created_at.
function logChange(db: Db, variantId: number, change: number, reason: (typeof STOCK_REASONS)[number], note: string | null = null) {
  return db
    .insert(stockChanges)
    .select(sql`SELECT NULL, ${variantId}, ${change}, (SELECT stock FROM variants WHERE id = ${variantId}), ${reason}, NULL, ${note}, unixepoch()`);
}

// "This many came in": adds them to the size, with a line in its history.
export async function restock(db: Db, variantId: number, quantity: number, note: string): Promise<Result> {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 10_000) {
    return { ok: false, message: "How many came in: a whole number, one or more." };
  }
  const [variant] = await db.select({ id: variants.id }).from(variants).where(eq(variants.id, variantId));
  if (!variant) return { ok: false, message: "That size isn't there any more." };
  await db.batch([
    db
      .update(variants)
      .set({ stock: sql`${variants.stock} + ${quantity}` })
      .where(eq(variants.id, variantId)),
    logChange(db, variantId, quantity, "restock", note.trim().slice(0, 200) || null),
  ]);
  return { ok: true };
}

// A product's stock history, newest first: every size's restocks, corrections, sales and returns.
export async function stockHistory(db: Db, productId: number, limit = 50) {
  return db
    .select({
      id: stockChanges.id,
      size: variants.size,
      change: stockChanges.change,
      stockAfter: stockChanges.stockAfter,
      reason: stockChanges.reason,
      note: stockChanges.note,
      orderNumber: orders.number,
      createdAt: stockChanges.createdAt,
    })
    .from(stockChanges)
    .innerJoin(variants, eq(variants.id, stockChanges.variantId))
    .leftJoin(orders, eq(orders.id, stockChanges.orderId))
    .where(eq(variants.productId, productId))
    .orderBy(desc(stockChanges.createdAt), desc(stockChanges.id))
    .limit(limit);
}

export type StockHistoryEntry = Awaited<ReturnType<typeof stockHistory>>[number];

const isStockConflict = (error: unknown) => {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current.message.includes("variants_stock_check")) return true;
  }
  return false;
};

// Applies what was changed (from the number the page showed to the one typed), not the typed
// number itself, so a sale made while the page was open still counts. All or nothing.
export async function saveStock(db: Db, changes: StockChange[]): Promise<Result> {
  const valid = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= 100_000;
  if (!changes.every((change) => valid(change.from) && valid(change.to))) {
    return { ok: false, message: "Stock is a whole number, zero or more." };
  }
  const updates = changes
    .filter((change) => change.to !== change.from)
    .flatMap((change) => [
      db
        .update(variants)
        .set({ stock: sql`${variants.stock} + ${change.to - change.from}` })
        .where(eq(variants.id, change.variantId)),
      logChange(db, change.variantId, change.to - change.from, "correction"),
    ]);
  const [first, ...rest] = updates as BatchItem<"sqlite">[];
  if (!first) return { ok: true };
  try {
    await db.batch([first, ...rest]);
  } catch (error) {
    if (!isStockConflict(error)) throw error;
    return { ok: false, message: "Some of these sold while you were editing. Nothing was saved; check the numbers and try again." };
  }
  return { ok: true };
}

export type StockProduct = Awaited<ReturnType<typeof listStock>>[number];
