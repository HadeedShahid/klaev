// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "./checkout";
import { createTestDb } from "./db/test-db";
import { discounts } from "./db/schema";
import { checkDiscount, discountOff } from "./discounts";
import { placeOrder } from "./orders";

const DARK_BROWN_S = "49253873647687"; // 2 in stock
const NOW = new Date("2026-10-27T12:00:00+05:00");
const customer: CheckoutValues = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  city: "Lahore",
  address: "House 1, Street 2",
  payment: "cod",
};

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);
afterAll(() => store?.dispose());

describe("discount codes", () => {
  test("what each kind takes off", () => {
    expect(discountOff({ kind: "percent", value: 10 }, 17999)).toEqual({ amount: 1800, freeDelivery: false });
    expect(discountOff({ kind: "fixed", value: 2000 }, 17999)).toEqual({ amount: 2000, freeDelivery: false });
    expect(discountOff({ kind: "fixed", value: 50000 }, 17999)).toEqual({ amount: 17999, freeDelivery: false });
    expect(discountOff({ kind: "free_delivery", value: 0 }, 17999)).toEqual({ amount: 0, freeDelivery: true });
  });

  test("a code is found however it's typed, and every limit is checked", async () => {
    await store.db.insert(discounts).values([
      { code: "EID10", kind: "percent", value: 10 },
      { code: "OFF", kind: "fixed", value: 1000, active: false },
      { code: "SOON", kind: "fixed", value: 1000, startsAt: new Date("2026-11-01T00:00:00+05:00") },
      { code: "OVER", kind: "fixed", value: 1000, endsAt: new Date("2026-10-26T00:00:00+05:00") },
      { code: "BIG", kind: "fixed", value: 1000, minSubtotal: 30000 },
    ]);
    expect(await checkDiscount(store.db, " eid10 ", { subtotal: 17999, now: NOW })).toMatchObject({ ok: true, code: "EID10", amount: 1800 });
    expect(await checkDiscount(store.db, "NOPE", { subtotal: 17999, now: NOW })).toMatchObject({ ok: false, message: "That code isn't valid." });
    expect(await checkDiscount(store.db, "OFF", { subtotal: 17999, now: NOW })).toMatchObject({ ok: false });
    expect(await checkDiscount(store.db, "SOON", { subtotal: 17999, now: NOW })).toMatchObject({ ok: false });
    expect(await checkDiscount(store.db, "OVER", { subtotal: 17999, now: NOW })).toMatchObject({ ok: false, message: "That code has ended." });
    expect(await checkDiscount(store.db, "BIG", { subtotal: 17999, now: NOW })).toMatchObject({ ok: false, message: "That code is for orders of PKR 30,000 or more." });
  });

  test("an order carries its discount, and a code runs out at its limit and once per customer", async () => {
    await store.db.insert(discounts).values([
      { code: "ONCE", kind: "fixed", value: 1000, oncePerCustomer: true },
      { code: "FREESHIP", kind: "free_delivery", value: 0, usageLimit: 1 },
    ]);
    const first = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }], discountCode: "once" });
    expect(first).toMatchObject({ ok: true });
    const order = await store.db.query.orders.findFirst({ where: (orders, { eq }) => eq(orders.number, (first as { number: number }).number) });
    // 17,999 less 1,000, plus 900 delivery.
    expect(order).toMatchObject({ discountCode: "ONCE", discountTotal: 1000, deliveryFee: 900, total: 17899, advance: 2000 });

    expect(await checkDiscount(store.db, "ONCE", { subtotal: 17999, phone: customer.phone, now: new Date() })).toMatchObject({
      ok: false,
      message: "You've used that code already.",
    });
    expect(await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }], discountCode: "ONCE" })).toMatchObject({
      ok: false,
      reason: "discount",
    });

    const free = await placeOrder(store.db, { customer: { ...customer, phone: "+923331112223" }, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }], discountCode: "FREESHIP" });
    expect(free).toMatchObject({ ok: true });
    const freeOrder = await store.db.query.orders.findFirst({ where: (orders, { eq }) => eq(orders.number, (free as { number: number }).number) });
    expect(freeOrder).toMatchObject({ discountCode: "FREESHIP", discountTotal: 0, deliveryFee: 0, total: 17999 });
    expect(await checkDiscount(store.db, "FREESHIP", { subtotal: 17999, now: new Date() })).toMatchObject({ ok: false, message: "That code has been used up." });
  });
});
