// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "../db/test-db";
import { products, variants } from "../db/schema";
import { placeOrder } from "../orders";
import { cancelOrder } from "./orders";
import { listStock, restock, saveStock, stockHistory } from "./stock";

const DARK_BROWN_S = 49253873647687; // 2 in stock
const DARK_BROWN_XL = 49253873745991; // sold out

let store: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);

afterAll(() => store?.dispose());

const stockOf = async (id: number) => (await store.db.select({ stock: variants.stock }).from(variants).where(eq(variants.id, id)))[0].stock;

describe("stock", () => {
  test("lists every product with its sizes and stock, drafts included", async () => {
    const products = await listStock(store.db);
    const darkBrown = products.find((product) => product.handle === "dark-brown-cropped-sheepskin-leather-jacket")!;
    expect(darkBrown).toMatchObject({ title: "Dark Brown Cropped Sheepskin Leather Jacket", status: "active" });
    expect(darkBrown.variants.map((variant) => [variant.size, variant.stock])).toEqual([
      ["S", 2],
      ["M", 1],
      ["L", 1],
      ["XL", 0],
    ]);
    expect(products.some((product) => product.status === "draft")).toBe(true);
  });

  test("saving applies the change made, so a sale made meanwhile still counts", async () => {
    // The page showed S at 2 and XL at 0. Before saving, someone buys an S.
    const sale = await placeOrder(store.db, {
      customer: { name: "A", email: "a@example.com", phone: "+923001234567", city: "Lahore", address: "1 Street", payment: "cod" },
      lines: [{ variantId: String(DARK_BROWN_S), quantity: 1 }],
    });
    expect(sale.ok).toBe(true);

    expect(
      await saveStock(store.db, [
        { variantId: DARK_BROWN_S, from: 2, to: 5 },
        { variantId: DARK_BROWN_XL, from: 0, to: 3 },
      ]),
    ).toEqual({ ok: true });
    expect(await stockOf(DARK_BROWN_S)).toBe(4);
    expect(await stockOf(DARK_BROWN_XL)).toBe(3);
  });

  test("stock can't go below zero or be a fraction, and a failed save changes nothing", async () => {
    expect(await saveStock(store.db, [{ variantId: DARK_BROWN_S, from: 2, to: -1 }])).toMatchObject({ ok: false });
    expect(await saveStock(store.db, [{ variantId: DARK_BROWN_S, from: 2, to: 1.5 }])).toMatchObject({ ok: false });
    // The page showed 2, but sales took them both: lowering by 2 more would go below zero.
    await store.db.update(variants).set({ stock: 0 }).where(eq(variants.id, DARK_BROWN_S));
    expect(
      await saveStock(store.db, [
        { variantId: DARK_BROWN_XL, from: 0, to: 3 },
        { variantId: DARK_BROWN_S, from: 2, to: 0 },
      ]),
    ).toMatchObject({ ok: false });
    expect(await stockOf(DARK_BROWN_XL)).toBe(0);
    expect(await stockOf(DARK_BROWN_S)).toBe(0);
  });
});

describe("restocking and history", () => {
  const darkBrownId = async () =>
    (await store.db.select({ id: products.id }).from(products).where(eq(products.handle, "dark-brown-cropped-sheepskin-leather-jacket")))[0].id;

  test("a restock adds what came in, and the history shows it", async () => {
    expect(await restock(store.db, DARK_BROWN_XL, 0, "")).toMatchObject({ ok: false });
    expect(await restock(store.db, DARK_BROWN_XL, -2, "")).toMatchObject({ ok: false });
    expect(await restock(store.db, DARK_BROWN_XL, 1.5, "")).toMatchObject({ ok: false });
    expect(await restock(store.db, DARK_BROWN_XL, 4, "Batch from the workshop")).toEqual({ ok: true });
    expect(await stockOf(DARK_BROWN_XL)).toBe(4);
    expect(await restock(store.db, DARK_BROWN_XL, 2, "")).toEqual({ ok: true });
    expect(await stockOf(DARK_BROWN_XL)).toBe(6);

    const history = await stockHistory(store.db, await darkBrownId());
    expect(history.slice(0, 2)).toMatchObject([
      { size: "XL", change: 2, stockAfter: 6, reason: "restock", note: null },
      { size: "XL", change: 4, stockAfter: 4, reason: "restock", note: "Batch from the workshop" },
    ]);
  });

  test("sales, cancellations and corrected counts are in the history too", async () => {
    const sale = await placeOrder(store.db, {
      customer: { name: "A", email: "a@example.com", phone: "+923001234567", city: "Lahore", address: "1 Street", payment: "cod" },
      lines: [{ variantId: String(DARK_BROWN_S), quantity: 1 }],
    });
    if (!sale.ok) throw new Error("not placed");
    await cancelOrder(store.db, sale.number);
    await saveStock(store.db, [{ variantId: DARK_BROWN_S, from: 2, to: 5 }]);

    const history = await stockHistory(store.db, await darkBrownId());
    expect(history.slice(0, 3)).toMatchObject([
      { size: "S", change: 3, stockAfter: 5, reason: "correction" },
      { size: "S", change: 1, stockAfter: 2, reason: "cancelled", orderNumber: sale.number },
      { size: "S", change: -1, stockAfter: 1, reason: "sale", orderNumber: sale.number },
    ]);
  });
});
