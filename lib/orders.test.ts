// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "./checkout";
import { createTestDb } from "./db/test-db";
import { customers, orderLines, orders, variants } from "./db/schema";
import { getOrderByToken, placeOrder } from "./orders";

const BURGUNDY_S = "49142312730695"; // 1 in stock
const DARK_BROWN_S = "49253873647687"; // 2 in stock
const DARK_BROWN_XL = "49253873745991"; // sold out
const BELT = "42606810529863"; // a draft

const customer: CheckoutValues = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  city: "Lahore",
  address: "House 1, Street 2, Model Town",
  payment: "cod",
};

let store: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);

afterAll(() => store?.dispose());

const stockOf = async (id: string) =>
  (await store.db.select({ stock: variants.stock }).from(variants).where(eq(variants.id, Number(id))))[0]?.stock;

describe("placeOrder", () => {
  test("a cash on delivery order: PKR 900 delivery, a PKR 2,000 advance, and the units taken from stock", async () => {
    const result = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
    expect(result).toMatchObject({ ok: true, number: 1022, soldOut: false });
    if (!result.ok) return;
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{24,}$/);

    const order = await store.db.query.orders.findFirst({
      where: eq(orders.token, result.token),
      with: { lines: true, customer: true },
    });
    expect(order).toMatchObject({
      number: 1022,
      status: "pending",
      paymentMethod: "cod",
      source: "web",
      name: "Ayesha Khan",
      email: "ayesha@example.com",
      phone: "+923001234567",
      city: "Lahore",
      address1: "House 1, Street 2, Model Town",
      country: "PK",
      subtotal: 17999,
      discountTotal: 0,
      deliveryFee: 900,
      total: 18899,
      advance: 2000,
    });
    expect(order?.lines).toMatchObject([
      { variantId: 49253873647687, title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "S", sku: "KLAEV-CROP-DBRN-S", quantity: 1, unitPrice: 17999 },
    ]);
    expect(order?.customer).toMatchObject({ name: "Ayesha Khan", email: "ayesha@example.com", city: "Lahore" });
    expect(await stockOf(DARK_BROWN_S)).toBe(1);
  });

  test("a bank transfer order delivers free and asks for the full amount", async () => {
    const result = await placeOrder(store.db, {
      customer: { ...customer, payment: "bank_transfer" },
      lines: [{ variantId: DARK_BROWN_S, quantity: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const order = await store.db.query.orders.findFirst({ where: eq(orders.token, result.token) });
    expect(order).toMatchObject({ paymentMethod: "bank_transfer", subtotal: 35998, deliveryFee: 0, total: 35998, advance: 0 });
  });

  test("numbers run on, and a returning customer is updated rather than added twice", async () => {
    await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
    const second = await placeOrder(store.db, {
      customer: { ...customer, phone: "+923009876543", city: "Karachi" },
      lines: [{ variantId: BURGUNDY_S, quantity: 1 }],
    });
    expect(second).toMatchObject({ ok: true, number: 1023 });
    const rows = await store.db.select().from(customers);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: "+923009876543", city: "Karachi" });
  });

  test("buying the last unit says the size has sold out, so pages can be refreshed", async () => {
    const result = await placeOrder(store.db, { customer, lines: [{ variantId: BURGUNDY_S, quantity: 1 }] });
    expect(result).toMatchObject({ ok: true, soldOut: true });
    expect(await stockOf(BURGUNDY_S)).toBe(0);
  });

  test("more than is in stock changes nothing and names the jacket", async () => {
    const result = await placeOrder(store.db, {
      customer,
      lines: [
        { variantId: DARK_BROWN_S, quantity: 1 },
        { variantId: BURGUNDY_S, quantity: 2 },
      ],
    });
    expect(result).toEqual({ ok: false, reason: "sold_out", items: ["Burgundy Cropped Sheepskin Leather Jacket, size S"] });
    expect(await store.db.$count(orders)).toBe(0);
    expect(await stockOf(DARK_BROWN_S)).toBe(2);
  });

  test("two customers racing for the last unit: one order goes through, the other changes nothing", async () => {
    const results = await Promise.all([
      placeOrder(store.db, { customer, lines: [{ variantId: BURGUNDY_S, quantity: 1 }] }),
      placeOrder(store.db, { customer: { ...customer, email: "bilal@example.com" }, lines: [{ variantId: BURGUNDY_S, quantity: 1 }] }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ ok: false, reason: "sold_out" });
    expect(await store.db.$count(orders)).toBe(1);
    expect(await store.db.$count(orderLines)).toBe(1);
    expect(await stockOf(BURGUNDY_S)).toBe(0);
  });

  test("when another order takes the last unit between the stock check and the write, nothing is written", async () => {
    // Stands in for a second Worker placing its order at that exact moment.
    const busy = new Proxy(store.db, {
      get(target, property, receiver) {
        if (property !== "batch") return Reflect.get(target, property, receiver);
        return async (statements: Parameters<typeof target.batch>[0]) => {
          await store.run([`UPDATE variants SET stock = 0 WHERE id = ${BURGUNDY_S}`]);
          return target.batch(statements);
        };
      },
    });
    const result = await placeOrder(busy, {
      customer,
      lines: [
        { variantId: DARK_BROWN_S, quantity: 1 },
        { variantId: BURGUNDY_S, quantity: 1 },
      ],
    });
    expect(result).toEqual({ ok: false, reason: "sold_out", items: ["Burgundy Cropped Sheepskin Leather Jacket, size S"] });
    expect(await store.db.$count(orders)).toBe(0);
    expect(await store.db.$count(customers)).toBe(0);
    expect(await stockOf(DARK_BROWN_S)).toBe(2);
  });

  test("sold-out sizes, drafts and an empty cart can't be ordered", async () => {
    expect(await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_XL, quantity: 1 }] })).toMatchObject({
      ok: false,
      reason: "sold_out",
    });
    expect(await placeOrder(store.db, { customer, lines: [{ variantId: BELT, quantity: 1 }] })).toMatchObject({
      ok: false,
      reason: "empty",
    });
    expect(await placeOrder(store.db, { customer, lines: [] })).toEqual({ ok: false, reason: "empty" });
    expect(await store.db.$count(orders)).toBe(0);
  });

  test("an order link finds its order, with lines and photos; any other link finds nothing", async () => {
    const result = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
    if (!result.ok) throw new Error("not placed");
    const order = await getOrderByToken(store.db, result.token);
    expect(order).toMatchObject({ number: 1022, paymentMethod: "cod", total: 18899, advance: 2000, receipts: [] });
    expect(order?.lines).toMatchObject([
      { title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "S", quantity: 1, unitPrice: 17999, image: { src: expect.stringContaining("/products/dark-brown-cropped-sheepskin-leather-jacket/") } },
    ]);
    expect(await getOrderByToken(store.db, "x".repeat(24))).toBeNull();
    expect(await getOrderByToken(store.db, "not a token")).toBeNull();
  });
});
