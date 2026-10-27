// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "../checkout";
import { createTestDb } from "../db/test-db";
import { orders, variants } from "../db/schema";
import { placeOrder } from "../orders";
import { dashboardSummary, needsAction, salesByDay } from "./dashboard";
import { confirmOrder, markDelivered, markShipped, recordPayment, recordPayout } from "./orders";

const DARK_BROWN_S = "49253873647687"; // 2 in stock
const DARK_BROWN_M = "49253873680455"; // 1 in stock
const NOW = new Date("2026-10-27T10:00:00+05:00");
const DAY = 24 * 60 * 60 * 1000;

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

// Places an order and backdates it to `daysAgo` days before NOW.
async function place(daysAgo: number, variantId = DARK_BROWN_S, payment: CheckoutValues["payment"] = "cod") {
  const result = await placeOrder(store.db, { customer: { ...customer, payment }, lines: [{ variantId, quantity: 1 }] });
  if (!result.ok) throw new Error("not placed");
  await store.db.update(orders).set({ createdAt: new Date(NOW.getTime() - daysAgo * DAY) }).where(eq(orders.number, result.number));
  return result.number;
}

describe("dashboard", () => {
  test("sales per day in Pakistan time, every day present, cancelled orders left out", async () => {
    await place(0);
    await place(2, DARK_BROWN_M, "bank_transfer");
    const rows = await salesByDay(store.db, 7, NOW);
    expect(rows).toHaveLength(7);
    expect(rows.at(-1)).toEqual({ date: "2026-10-27", sales: 18899, orders: 1 });
    expect(rows.at(-3)).toEqual({ date: "2026-10-25", sales: 17999, orders: 1 });
    expect(rows[0]).toEqual({ date: "2026-10-21", sales: 0, orders: 0 });
  });

  test("totals against the period before, cash with the courier, and profit on delivered orders", async () => {
    await store.db.update(variants).set({ costPrice: 9000 }).where(eq(variants.id, Number(DARK_BROWN_S)));
    const recent = await place(1);
    await place(10);
    await confirmOrder(store.db, recent);
    await markShipped(store.db, recent, { trackingNumber: "PX1", courierFee: 590 });
    await markDelivered(store.db, recent);

    let summary = await dashboardSummary(store.db, 7, NOW);
    expect(summary.sales).toEqual({ current: 18899, previous: 18899 });
    expect(summary.orders).toEqual({ current: 1, previous: 1 });
    // Delivered, not paid out: the rider's PKR 16,899 is with the courier.
    expect(summary.cashWithCourier).toEqual({ amount: 16899, orders: 1 });
    // 18,899 less 9,000 cost, 590 courier and an estimated 4% of 16,899 (676).
    expect(summary.profit).toEqual({ amount: 8633, orders: 1, missingCost: 0, estimated: true });

    await recordPayout(store.db, recent, 16223);
    summary = await dashboardSummary(store.db, 7, NOW);
    expect(summary.cashWithCourier).toEqual({ amount: 0, orders: 0 });
    expect(summary.profit).toEqual({ amount: 8633, orders: 1, missingCost: 0, estimated: false });
  });

  test("an order whose cash was recorded by hand, as Shopify's were, isn't cash with the courier", async () => {
    const number = await place(1, DARK_BROWN_M);
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX3", courierFee: 590 });
    await markDelivered(store.db, number);
    await recordPayment(store.db, number, { method: "cod", amount: 16899, reference: "", receivedAt: NOW });
    expect((await dashboardSummary(store.db, 7, NOW)).cashWithCourier).toEqual({ amount: 0, orders: 0 });
    expect((await needsAction(store.db, NOW)).withCourier).toBe(0);
  });

  test("what needs action, and sizes down to their last piece", async () => {
    await place(0, DARK_BROWN_M);
    const shipped = await place(8);
    await confirmOrder(store.db, shipped);
    await markShipped(store.db, shipped, { trackingNumber: "PX2", courierFee: 590 });
    await store.db.update(orders).set({ shippedAt: new Date(NOW.getTime() - 7 * DAY) }).where(eq(orders.number, shipped));

    const action = await needsAction(store.db, NOW);
    expect(action).toMatchObject({ toConfirm: 1, receiptsWaiting: 0, toShip: 0, overdue: 1, withCourier: 0 });
    // Dark brown M just sold its last one; S is down to one.
    expect(action.lowStock).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "M", stock: 0 }),
        expect.objectContaining({ title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "S", stock: 1 }),
      ]),
    );
  });
});
