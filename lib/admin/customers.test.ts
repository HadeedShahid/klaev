// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "../checkout";
import { createTestDb } from "../db/test-db";
import { customers, orders } from "../db/schema";
import { placeOrder } from "../orders";
import { countCustomers, customerCounts, customerHistory, getCustomer, listCustomers, saveCustomer } from "./customers";

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

let number = 3000;
// An order placed some days before NOW, in a given state.
async function order(customerId: number, { daysAgo, status, total = 18899 }: { daysAgo: number; status: (typeof orders.$inferInsert)["status"]; total?: number }) {
  number += 1;
  await store.db.insert(orders).values({
    number,
    customerId,
    status,
    paymentMethod: "cod",
    name: "Test",
    phone: null,
    subtotal: total,
    total,
    createdAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
  });
}

describe("customers", () => {
  test("a returning customer with a new email is found by their phone", async () => {
    const first = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
    const second = await placeOrder(store.db, {
      customer: { ...customer, email: "ayesha.k@example.com", address: "Flat 9, Gulberg" },
      lines: [{ variantId: DARK_BROWN_S, quantity: 1 }],
    });
    expect(first.ok && second.ok).toBe(true);

    const rows = await store.db.select().from(customers).where(eq(customers.phone, customer.phone));
    expect(rows).toHaveLength(1);
    // The record keeps its email and takes the newest address.
    expect(rows[0]).toMatchObject({ email: "ayesha@example.com", address1: "Flat 9, Gulberg" });
    const placed = await store.db.select({ customerId: orders.customerId, email: orders.email }).from(orders).where(eq(orders.phone, customer.phone));
    expect(placed.map((row) => row.customerId)).toEqual([rows[0].id, rows[0].id]);
    // The order keeps the email it was placed with.
    expect(placed.map((row) => row.email).sort()).toEqual(["ayesha.k@example.com", "ayesha@example.com"]);
  });

  test("two orders from one number at the same moment make one customer", async () => {
    const [one, two] = await Promise.all([
      placeOrder(store.db, { customer: { ...customer, email: "first@example.com" }, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] }),
      placeOrder(store.db, { customer: { ...customer, email: "second@example.com" }, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] }),
    ]);
    expect(one.ok && two.ok).toBe(true);
    const rows = await store.db.select().from(customers).where(eq(customers.phone, customer.phone));
    expect(rows).toHaveLength(1);
    const owners = await store.db.select({ customerId: orders.customerId }).from(orders).where(eq(orders.phone, customer.phone));
    expect(owners.map((row) => row.customerId)).toEqual([rows[0].id, rows[0].id]);
  });

  test("segments: first-time, repeat, lapsed and refused", async () => {
    const [sana, bilal, omar, hina, zara] = await store.db
      .insert(customers)
      .values([
        { name: "Sana", email: "sana@example.com", phone: "+923001110001" },
        { name: "Bilal", email: "bilal@example.com", phone: "+923001110002" },
        { name: "Omar", email: "omar@example.com", phone: "+923001110003" },
        { name: "Hina", email: "hina@example.com", phone: "+923001110004" },
        { name: "Zara", email: "zara@example.com", phone: "+923001110005" },
      ])
      .returning({ id: customers.id });
    await order(sana.id, { daysAgo: 3, status: "pending" });
    await order(bilal.id, { daysAgo: 40, status: "delivered" });
    await order(bilal.id, { daysAgo: 5, status: "delivered", total: 17999 });
    await order(bilal.id, { daysAgo: 4, status: "cancelled" });
    await order(omar.id, { daysAgo: 200, status: "delivered" });
    await order(hina.id, { daysAgo: 10, status: "refused" });
    // Zara has no orders, like a customer brought over from Shopify who never bought.
    void zara;

    const names = async (segment?: Parameters<typeof listCustomers>[1]["segment"]) =>
      (await listCustomers(store.db, { segment, now: NOW })).map((row) => row.name);
    expect(await names("first_time")).toEqual(["Sana", "Hina", "Omar"]);
    expect(await names("repeat")).toEqual(["Bilal"]);
    expect(await names("lapsed")).toEqual(["Omar"]);
    expect(await names("refused")).toEqual(["Hina"]);
    // Most recent buyers first; those who never ordered last.
    expect(await names()).toEqual(["Sana", "Bilal", "Hina", "Omar", "Zara"]);

    const [bilalRow] = await listCustomers(store.db, { query: "bilal", now: NOW });
    expect(bilalRow).toMatchObject({ orders: 2, spent: 18899 + 17999, refused: 0 });
    expect(await listCustomers(store.db, { query: "0300 1110004", now: NOW })).toMatchObject([{ name: "Hina", refused: 1, spent: 0 }]);
    // An order still waiting for its advance isn't money spent yet.
    expect(await listCustomers(store.db, { query: "sana", now: NOW })).toMatchObject([{ orders: 1, spent: 0 }]);

    expect(await customerCounts(store.db, NOW)).toEqual({ all: 5, first_time: 3, repeat: 1, lapsed: 1, refused: 1 });
    expect(await countCustomers(store.db, { segment: "first_time", now: NOW })).toBe(3);
    expect(await countCustomers(store.db, { query: "example.com", now: NOW })).toBe(5);

    const bilalPage = (await getCustomer(store.db, bilal.id))!;
    expect(bilalPage.orders).toHaveLength(3);
    expect(bilalPage.stats).toMatchObject({ orders: 2, spent: 36898, average: 18449, refused: 0, cancelled: 1 });
  });

  test("an order shows the customer's other orders and refusals", async () => {
    const [hina] = await store.db.insert(customers).values({ name: "Hina", email: "hina@example.com", phone: "+923001110004" }).returning({ id: customers.id });
    await order(hina.id, { daysAgo: 30, status: "refused" });
    await order(hina.id, { daysAgo: 20, status: "delivered" });
    await order(hina.id, { daysAgo: 1, status: "pending" });
    const [latest] = await store.db.select({ id: orders.id }).from(orders).where(eq(orders.number, number));
    expect(await customerHistory(store.db, { id: latest.id, customerId: hina.id, phone: null })).toEqual({ orders: 2, refused: 1 });
  });

  test("a customer's record can be corrected, and emails stay unique", async () => {
    const [one, two] = await store.db
      .insert(customers)
      .values([
        { name: "One", email: "one@example.com" },
        { name: "Two", email: "two@example.com" },
      ])
      .returning({ id: customers.id });
    const input = { name: "One Khan", email: "ONE@example.com", phone: "0300 2223334", city: "Multan", address1: "House 5", tags: "VIP, wholesale", note: "Prefers evening calls." };
    expect(await saveCustomer(store.db, one.id, input)).toEqual({ ok: true });
    expect(await getCustomer(store.db, one.id)).toMatchObject({ name: "One Khan", email: "one@example.com", phone: "+923002223334", tags: ["VIP", "wholesale"], note: "Prefers evening calls." });
    expect(await saveCustomer(store.db, two.id, { ...input, email: "one@example.com" })).toMatchObject({ ok: false, message: "Another customer has that email." });
    expect(await saveCustomer(store.db, two.id, { ...input, email: "", phone: "123" })).toMatchObject({ ok: false });
  });
});
