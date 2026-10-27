// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "../checkout";
import { createTestDb } from "../db/test-db";
import { variants } from "../db/schema";
import { placeOrder } from "../orders";
import {
  cancelOrder,
  confirmOrder,
  deletePayment,
  editContact,
  editShipping,
  getAdminOrder,
  listOrders,
  markDelivered,
  markPacked,
  markRefused,
  markShipped,
  orderCounts,
  orderProfit,
  paymentState,
  recordPayment,
  recordPayout,
  saveNote,
  setAdvance,
  updatePayment,
} from "./orders";

const DARK_BROWN_S = "49253873647687"; // 2 in stock
const DARK_BROWN_M = "49253873680455";

const ayesha: CheckoutValues = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  city: "Lahore",
  address: "House 1, Street 2, Model Town",
  payment: "cod",
};
const bilal: CheckoutValues = { ...ayesha, name: "Bilal Ahmed", email: "bilal@example.com", phone: "+923331112223", city: "Karachi", payment: "bank_transfer" };

let store: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);

afterAll(() => store?.dispose());

const stockOf = async (id: string) =>
  (await store.db.select({ stock: variants.stock }).from(variants).where(eq(variants.id, Number(id))))[0].stock;

async function place(customer: CheckoutValues, variantId = DARK_BROWN_S) {
  const result = await placeOrder(store.db, { customer, lines: [{ variantId, quantity: 1 }] });
  if (!result.ok) throw new Error("order not placed");
  return result.number;
}

describe("listing orders", () => {
  test("newest first, filtered by status, and found by number, name or phone", async () => {
    const first = await place(ayesha);
    const second = await place(bilal);

    const all = await listOrders(store.db, {});
    expect(all.map((order) => order.number)).toEqual([second, first]);
    expect(all[1]).toMatchObject({ name: "Ayesha Khan", city: "Lahore", total: 18899, paid: 0, receipts: 0, items: 1 });

    await confirmOrder(store.db, first);
    expect((await listOrders(store.db, { filter: "to_confirm" })).map((order) => order.number)).toEqual([second]);
    expect((await listOrders(store.db, { filter: "to_ship" })).map((order) => order.number)).toEqual([first]);
    const third = await place({ ...ayesha, name: "Sara Malik", email: "sara@example.com", phone: "+923451234567" }, DARK_BROWN_M);
    expect((await listOrders(store.db, { filter: "to_confirm", oldestFirst: true })).map((order) => order.number)).toEqual([second, third]);
    await cancelOrder(store.db, third);
    expect((await listOrders(store.db, { filter: "done" })).map((order) => order.number)).toEqual([third]);

    expect((await listOrders(store.db, { query: String(first) })).map((order) => order.number)).toEqual([first]);
    expect((await listOrders(store.db, { query: "bilal" })).map((order) => order.number)).toEqual([second]);
    expect((await listOrders(store.db, { query: "0333 1112223" })).map((order) => order.number)).toEqual([second]);

    expect(await orderCounts(store.db)).toMatchObject({ to_confirm: 1, to_ship: 1, shipped: 0 });
  });

  test("each row's paid amount and item count are its own order's", async () => {
    const first = await place(ayesha);
    const second = await place(bilal);
    const third = await place(ayesha, DARK_BROWN_M);
    // Payment and line ids out of step with order ids, so a mismatched join would show.
    await confirmOrder(store.db, third);
    await confirmOrder(store.db, second);
    const rows = await listOrders(store.db, {});
    const paidOf = (number: number) => rows.find((row) => row.number === number)?.paid;
    expect([paidOf(first), paidOf(second), paidOf(third)]).toEqual([0, 17999, 2000]);
    expect(rows.map((row) => row.items)).toEqual([1, 1, 1]);
  });
});

describe("an order's life", () => {
  test("confirming a COD order records the advance; the cash stays with the courier until its payout, less 4% tax", async () => {
    // A made-up cost: the real ones never enter the public repository.
    await store.db.update(variants).set({ costPrice: 9000 }).where(eq(variants.id, Number(DARK_BROWN_S)));
    const number = await place(ayesha);
    expect(await confirmOrder(store.db, number)).toEqual({ ok: true });

    let order = (await getAdminOrder(store.db, number))!;
    expect(order.status).toBe("confirmed");
    expect(order.confirmedAt).toBeInstanceOf(Date);
    expect(order.payments).toMatchObject([{ method: "bank_transfer", amount: 2000 }]);
    expect(paymentState(order)).toBe("advance");

    // Confirming again changes nothing.
    expect(await confirmOrder(store.db, number)).toMatchObject({ ok: false });
    expect((await getAdminOrder(store.db, number))!.payments).toHaveLength(1);

    expect(await markPacked(store.db, number)).toEqual({ ok: true });
    expect(await markShipped(store.db, number, { trackingNumber: "", courierFee: null })).toMatchObject({ ok: false });
    expect(await markShipped(store.db, number, { trackingNumber: " PX123456 ", courierFee: 1100 })).toEqual({ ok: true });
    // A payout before delivery makes no sense.
    expect(await recordPayout(store.db, number, 16223)).toMatchObject({ ok: false });
    expect(await markDelivered(store.db, number)).toEqual({ ok: true });

    order = (await getAdminOrder(store.db, number))!;
    expect(order).toMatchObject({ status: "delivered", trackingNumber: "PX123456", courierFee: 1100, paid: 2000, codTax: 0 });
    expect(order.packedAt).toBeInstanceOf(Date);
    expect(order.shippedAt).toBeInstanceOf(Date);
    expect(order.deliveredAt).toBeInstanceOf(Date);
    expect(paymentState(order)).toBe("with_courier");

    // The courier pays out the PKR 16,899 it collected, less 4% (PKR 676).
    expect(await recordPayout(store.db, number, 20000)).toMatchObject({ ok: false });
    expect(await recordPayout(store.db, number, 16223)).toEqual({ ok: true });
    expect(await recordPayout(store.db, number, 16223)).toMatchObject({ ok: false });
    order = (await getAdminOrder(store.db, number))!;
    expect(order).toMatchObject({ paid: 18223, codTax: 676 });
    expect(order.paidOutAt).toBeInstanceOf(Date);
    expect(order.payments.map((payment) => [payment.method, payment.amount, payment.note])).toEqual([
      ["bank_transfer", 2000, "Advance"],
      ["cod", 16223, "Courier payout"],
    ]);
    expect(paymentState(order)).toBe("paid");

    // Profit: what came in, less what the jackets cost, the courier's charge and the tax.
    expect(orderProfit(order)).toEqual({ revenue: 18899, cost: 9000, courier: 1100, tax: 676, profit: 8123, costMissing: false, complete: true });
  });

  test("confirming a bank transfer order records the full transfer", async () => {
    const number = await place(bilal);
    await confirmOrder(store.db, number);
    const order = (await getAdminOrder(store.db, number))!;
    expect(order.payments).toMatchObject([{ method: "bank_transfer", amount: 17999 }]);
    expect(paymentState(order)).toBe("paid");
  });

  test("a bargained advance is used when the order is confirmed, and can't exceed the total", async () => {
    const number = await place(ayesha);
    expect(await setAdvance(store.db, number, 20000)).toMatchObject({ ok: false });
    expect(await setAdvance(store.db, number, -1)).toMatchObject({ ok: false });
    expect(await setAdvance(store.db, number, 1000)).toEqual({ ok: true });
    await confirmOrder(store.db, number);
    const order = (await getAdminOrder(store.db, number))!;
    expect(order.advance).toBe(1000);
    expect(order.payments).toMatchObject([{ amount: 1000 }]);
    // Bank transfer orders have no advance to change.
    const bank = await place(bilal, DARK_BROWN_M);
    expect(await setAdvance(store.db, bank, 500)).toMatchObject({ ok: false });
  });

  test("cancelling puts the units back once, however many times it is pressed", async () => {
    const before = await stockOf(DARK_BROWN_S);
    const number = await place(ayesha);
    expect(await stockOf(DARK_BROWN_S)).toBe(before - 1);

    expect(await cancelOrder(store.db, number)).toEqual({ ok: true });
    expect(await cancelOrder(store.db, number)).toMatchObject({ ok: false });
    expect(await stockOf(DARK_BROWN_S)).toBe(before);
    const order = (await getAdminOrder(store.db, number))!;
    expect(order.status).toBe("cancelled");
    expect(order.cancelledAt).toBeInstanceOf(Date);
  });

  test("a shipped order can't be cancelled, but a refused one comes back into stock", async () => {
    const before = await stockOf(DARK_BROWN_M);
    const number = await place(ayesha, DARK_BROWN_M);
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX1", courierFee: null });

    expect(await cancelOrder(store.db, number)).toMatchObject({ ok: false });
    expect(await markRefused(store.db, number)).toEqual({ ok: true });
    expect(await markRefused(store.db, number)).toMatchObject({ ok: false });
    expect(await stockOf(DARK_BROWN_M)).toBe(before);
    expect((await getAdminOrder(store.db, number))!.refusedAt).toBeInstanceOf(Date);
  });

  test("payments recorded by hand add to what is paid; nonsense amounts are refused", async () => {
    const number = await place(ayesha);
    const receivedAt = new Date("2026-10-26T10:00:00Z");
    expect(await recordPayment(store.db, number, { method: "bank_transfer", amount: 0, reference: "", receivedAt })).toMatchObject({ ok: false });
    expect(await recordPayment(store.db, number, { method: "bank_transfer", amount: 1.5, reference: "", receivedAt })).toMatchObject({ ok: false });
    expect(await recordPayment(store.db, number, { method: "bank_transfer", amount: 2000, reference: "HBL 4411", receivedAt })).toEqual({ ok: true });

    const order = (await getAdminOrder(store.db, number))!;
    expect(order.paid).toBe(2000);
    expect(order.payments).toMatchObject([{ amount: 2000, reference: "HBL 4411", receivedAt }]);
    // Confirming now owes nothing more, so it records nothing more.
    await confirmOrder(store.db, number);
    expect((await getAdminOrder(store.db, number))!.payments).toHaveLength(1);
  });

  test("a note is kept on the order", async () => {
    const number = await place(ayesha);
    expect(await saveNote(store.db, number, "  Call before delivery  ")).toEqual({ ok: true });
    expect((await getAdminOrder(store.db, number))!.note).toBe("Call before delivery");
  });

  test("an order that doesn't exist is null, and actions on it fail", async () => {
    expect(await getAdminOrder(store.db, 99999)).toBeNull();
    expect(await confirmOrder(store.db, 99999)).toMatchObject({ ok: false });
  });
});

describe("editing an order at any step", () => {
  test("the advance can change until the payout, and a recorded advance changes with it", async () => {
    const number = await place(ayesha);
    await confirmOrder(store.db, number);
    expect(await setAdvance(store.db, number, 1500)).toEqual({ ok: true });
    let order = (await getAdminOrder(store.db, number))!;
    expect(order.advance).toBe(1500);
    expect(order.payments).toMatchObject([{ note: "Advance", amount: 1500 }]);

    await markShipped(store.db, number, { trackingNumber: "PX9", courierFee: 590 });
    await markDelivered(store.db, number);
    expect(await setAdvance(store.db, number, 2500)).toEqual({ ok: true });
    order = (await getAdminOrder(store.db, number))!;
    expect(order.paid).toBe(2500);

    await recordPayout(store.db, number, 15743);
    expect(await setAdvance(store.db, number, 1000)).toMatchObject({ ok: false });
  });

  test("contact details are corrected, with the phone stored the usual way", async () => {
    const number = await place(ayesha);
    expect(await editContact(store.db, number, { name: "", phone: "0300 1234567", email: "", address1: "x", city: "Lahore" })).toMatchObject({ ok: false });
    expect(await editContact(store.db, number, { name: "Ayesha K.", phone: "12", email: "", address1: "x", city: "Lahore" })).toMatchObject({ ok: false });
    expect(
      await editContact(store.db, number, { name: " Ayesha K. ", phone: "0321 7654321", email: "AYESHA@example.com ", address1: "House 9, DHA", city: "Karachi" }),
    ).toEqual({ ok: true });
    expect(await getAdminOrder(store.db, number)).toMatchObject({
      name: "Ayesha K.",
      phone: "+923217654321",
      email: "ayesha@example.com",
      address1: "House 9, DHA",
      city: "Karachi",
    });
  });

  test("the tracking number and courier charge can be corrected once shipped", async () => {
    const number = await place(ayesha);
    expect(await editShipping(store.db, number, { trackingNumber: "PX1", courierFee: 590 })).toMatchObject({ ok: false });
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX1", courierFee: 590 });
    expect(await editShipping(store.db, number, { trackingNumber: "PX2", courierFee: 480 })).toEqual({ ok: true });
    expect(await getAdminOrder(store.db, number)).toMatchObject({ trackingNumber: "PX2", courierFee: 480 });
  });

  test("a payment can be corrected or removed; removing the payout clears its tax", async () => {
    const number = await place(ayesha);
    await confirmOrder(store.db, number);
    await markShipped(store.db, number, { trackingNumber: "PX1", courierFee: 590 });
    await markDelivered(store.db, number);
    await recordPayout(store.db, number, 16223);
    let order = (await getAdminOrder(store.db, number))!;
    const [advance, payout] = order.payments;

    expect(await updatePayment(store.db, advance.id, { method: "bank_transfer", amount: 0, reference: "", receivedAt: new Date() })).toMatchObject({ ok: false });
    expect(await updatePayment(store.db, advance.id, { method: "bank_transfer", amount: 2000, reference: "HBL 77", receivedAt: advance.receivedAt })).toEqual({ ok: true });
    // The payout was really PKR 16,200: the courier kept PKR 699.
    expect(await updatePayment(store.db, payout.id, { method: "cod", amount: 16200, reference: "", receivedAt: payout.receivedAt })).toEqual({ ok: true });
    order = (await getAdminOrder(store.db, number))!;
    expect(order).toMatchObject({ paid: 18200, codTax: 699 });
    expect(order.payments[0].reference).toBe("HBL 77");

    expect(await deletePayment(store.db, payout.id)).toEqual({ ok: true });
    order = (await getAdminOrder(store.db, number))!;
    expect(order).toMatchObject({ paid: 2000, codTax: 0, paidOutAt: null });
    expect(paymentState(order)).toBe("with_courier");
    expect(await deletePayment(store.db, 999999)).toMatchObject({ ok: false });
  });
});
