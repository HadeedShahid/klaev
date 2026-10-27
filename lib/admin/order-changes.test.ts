// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "../checkout";
import { createTestDb } from "../db/test-db";
import { discounts, orders, stockChanges, variants } from "../db/schema";
import { placeOrder } from "../orders";
import { createExchange, createManualOrder, editItems, receiveReturn, type ManualOrderInput } from "./order-changes";
import { confirmOrder, markDelivered, markShipped, setCourierStatus } from "./orders";

const BROWN = { S: 49253873647687, M: 49253873680455, L: 49253873713223, XL: 49253873745991 }; // 2, 1, 1, 0 in stock; PKR 17,999
const BLACK_M = 42204090892359; // 1 in stock, PKR 14,999
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

const stock = async (id: number) => (await store.db.select({ stock: variants.stock }).from(variants).where(eq(variants.id, id)))[0].stock;
const order = async (number: number) => (await store.db.query.orders.findFirst({ where: eq(orders.number, number), with: { lines: true } }))!;
async function place(lines: { variantId: number; quantity: number }[], extra: Partial<CheckoutValues> = {}, discountCode?: string) {
  const result = await placeOrder(store.db, { customer: { ...customer, ...extra }, lines: lines.map((line) => ({ ...line, variantId: String(line.variantId) })), discountCode });
  if (!result.ok) throw new Error(`not placed: ${result.reason}`);
  return result.number;
}

describe("editing an order's items", () => {
  test("a size swap moves stock both ways and keeps the totals right", async () => {
    const number = await place([{ variantId: BROWN.S, quantity: 1 }]);
    expect(await stock(BROWN.S)).toBe(1);

    expect(await editItems(store.db, number, [{ variantId: BROWN.M, quantity: 1 }])).toEqual({ ok: true });
    expect(await stock(BROWN.S)).toBe(2);
    expect(await stock(BROWN.M)).toBe(0);
    const edited = await order(number);
    expect(edited.lines.map((line) => [line.size, line.quantity, line.unitPrice])).toEqual([["M", 1, 17999]]);
    expect(edited).toMatchObject({ subtotal: 17999, total: 18899, advance: 2000 });

    const history = await store.db.select().from(stockChanges).where(eq(stockChanges.reason, "edit"));
    expect(history.map((row) => [row.variantId, row.change, row.stockAfter])).toEqual(
      expect.arrayContaining([
        [BROWN.S, 1, 2],
        [BROWN.M, -1, 0],
      ]),
    );
  });

  test("adding a jacket takes today's price, a percentage code is worked out again, and stock limits hold", async () => {
    await store.db.insert(discounts).values({ code: "EID10", kind: "percent", value: 10 });
    const number = await place([{ variantId: BROWN.S, quantity: 1 }], {}, "eid10");
    expect(await order(number)).toMatchObject({ discountTotal: 1800, total: 17099 });

    expect(await editItems(store.db, number, [{ variantId: BROWN.S, quantity: 1 }, { variantId: BLACK_M, quantity: 1 }])).toEqual({ ok: true });
    // 17,999 + 14,999 = 32,998; 10% is 3,300.
    expect(await order(number)).toMatchObject({ subtotal: 32998, discountTotal: 3300, total: 30598 });

    expect(await editItems(store.db, number, [{ variantId: BROWN.S, quantity: 1 }, { variantId: BROWN.XL, quantity: 1 }])).toMatchObject({
      ok: false,
      message: "Dark Brown Cropped Sheepskin Leather Jacket, size XL is sold out.",
    });
    expect(await editItems(store.db, number, [])).toMatchObject({ ok: false });
  });

  test("once shipped, items stay", async () => {
    const number = await place([{ variantId: BROWN.S, quantity: 1 }]);
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX-1", courierFee: 590 });
    expect(await editItems(store.db, number, [{ variantId: BROWN.M, quantity: 1 }])).toMatchObject({ ok: false });
  });
});

describe("courier status", () => {
  test("starts as booked when shipped, and changes only while shipped", async () => {
    const number = await place([{ variantId: BROWN.S, quantity: 1 }]);
    expect(await setCourierStatus(store.db, number, "in_transit")).toMatchObject({ ok: false });
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX-1", courierFee: 590 });
    expect(await order(number)).toMatchObject({ courierStatus: "booked" });
    expect(await setCourierStatus(store.db, number, "attempted")).toEqual({ ok: true });
    expect(await setCourierStatus(store.db, number, "lost")).toMatchObject({ ok: false });
    expect(await order(number)).toMatchObject({ courierStatus: "attempted" });
  });
});

describe("size exchanges", () => {
  test("the new size goes out as a linked order for the delivery charge; the old one is restocked when it's back", async () => {
    const number = await place([{ variantId: BROWN.S, quantity: 1 }]);
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX-1", courierFee: 590 });
    const [line] = (await order(number)).lines;
    expect(await createExchange(store.db, number, { lineId: line.id, variantId: BROWN.M, charge: 500 })).toMatchObject({ ok: false });
    await markDelivered(store.db, number);

    expect(await createExchange(store.db, number, { lineId: line.id, variantId: BLACK_M, charge: 500 })).toMatchObject({ ok: false });
    expect(await createExchange(store.db, number, { lineId: line.id, variantId: BROWN.XL, charge: 500 })).toMatchObject({ ok: false });
    const exchange = await createExchange(store.db, number, { lineId: line.id, variantId: BROWN.M, charge: 500 });
    if (!exchange.ok) throw new Error(exchange.message);

    const sent = await order(exchange.number);
    const original = await order(number);
    expect(sent).toMatchObject({ source: "exchange", status: "confirmed", exchangeOf: original.id, returnVariantId: BROWN.S, total: 500, deliveryFee: 500, customerId: original.customerId });
    expect(sent.lines.map((row) => [row.size, row.unitPrice, row.costPrice])).toEqual([["M", 0, 0]]);
    expect(await stock(BROWN.M)).toBe(0);
    expect(await stock(BROWN.S)).toBe(1);

    expect(await receiveReturn(store.db, exchange.number)).toEqual({ ok: true });
    expect(await stock(BROWN.S)).toBe(2);
    expect(await receiveReturn(store.db, exchange.number)).toMatchObject({ ok: false });
    expect(await stock(BROWN.S)).toBe(2);
    expect(await receiveReturn(store.db, number)).toMatchObject({ ok: false });
  });
});

describe("manual orders", () => {
  const input: ManualOrderInput = {
    name: "Usman Tariq",
    phone: "0333 5557788",
    email: "",
    city: "Faisalabad",
    address: "House 9",
    items: [{ variantId: BROWN.S, quantity: 1, unitPrice: 16500 }],
    discount: 500,
    deliveryFee: 0,
    paymentMethod: "cod",
    advance: 3000,
    received: true,
    note: "Agreed on WhatsApp.",
  };

  test("a COD order with its advance in is confirmed, at the agreed price, and takes stock", async () => {
    const created = await createManualOrder(store.db, input);
    if (!created.ok) throw new Error(created.message);
    const row = (await store.db.query.orders.findFirst({ where: eq(orders.number, created.number), with: { lines: true, payments: true, customer: true } }))!;
    expect(row).toMatchObject({ source: "manual", status: "confirmed", subtotal: 16500, discountTotal: 500, total: 16000, advance: 3000, phone: "+923335557788", email: null });
    expect(row.lines.map((line) => [line.size, line.unitPrice])).toEqual([["S", 16500]]);
    expect(row.payments.map((payment) => [payment.method, payment.amount, payment.note])).toEqual([["bank_transfer", 3000, "Advance"]]);
    expect(row.customer).toMatchObject({ name: "Usman Tariq", phone: "+923335557788" });
    expect(await stock(BROWN.S)).toBe(1);
  });

  test("a sale in person with the cash in hand is delivered at once; nothing in yet waits to be confirmed", async () => {
    const inPerson = await createManualOrder(store.db, { ...input, paymentMethod: "in_person", items: [{ variantId: BLACK_M, quantity: 1, unitPrice: 14999 }], discount: 0 });
    if (!inPerson.ok) throw new Error(inPerson.message);
    const handed = (await store.db.query.orders.findFirst({ where: eq(orders.number, inPerson.number), with: { payments: true } }))!;
    expect(handed).toMatchObject({ status: "delivered", total: 14999, advance: 0 });
    expect(handed.payments.map((payment) => [payment.method, payment.amount])).toEqual([["cash", 14999]]);

    const waiting = await createManualOrder(store.db, { ...input, paymentMethod: "bank_transfer", received: false });
    if (!waiting.ok) throw new Error(waiting.message);
    expect(await order(waiting.number)).toMatchObject({ status: "pending", advance: 0, total: 16000 });

    // The same phone is the same customer.
    const numbers = [inPerson.number, waiting.number];
    const owners = await Promise.all(numbers.map(async (number) => (await order(number)).customerId));
    expect(new Set(owners).size).toBe(1);

    expect(await createManualOrder(store.db, { ...input, items: [{ variantId: BROWN.XL, quantity: 1, unitPrice: 17999 }] })).toMatchObject({ ok: false });
    expect(await createManualOrder(store.db, { ...input, phone: "12" })).toMatchObject({ ok: false });
    expect(await createManualOrder(store.db, { ...input, discount: 99999 })).toMatchObject({ ok: false });
  });
});
