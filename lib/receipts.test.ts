// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { needsAction } from "./admin/dashboard";
import { listOrders } from "./admin/orders";
import { createTestDb } from "./db/test-db";
import { receipts } from "./db/schema";
import { getOrderByToken, placeOrder } from "./orders";
import { checkReceipt, confirmReceipt, isReceiptKeyFor, MAX_RECEIPT_BYTES, receiptKindFor, saveReceipt } from "./receipts";

let store: Awaited<ReturnType<typeof createTestDb>>;
let order: { id: number; number: number };

beforeAll(async () => {
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
  const placed = await placeOrder(store.db, {
    customer: { name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567", city: "Lahore", address: "House 1, Street 2", payment: "bank_transfer" },
    lines: [{ variantId: "49253873647687", quantity: 1 }],
  });
  if (!placed.ok) throw new Error("could not place the test order");
  const row = await store.db.query.orders.findFirst({ where: (orders, { eq }) => eq(orders.token, placed.token) });
  order = { id: row!.id, number: row!.number };
}, 60_000);

afterAll(() => store?.dispose());

describe("saveReceipt", () => {
  test("a screenshot is stored in the order's folder and recorded against the order", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "IMG_2041.PNG", { type: "image/png" });
    expect(await saveReceipt(store.db, store.env.RECEIPTS, order, file)).toEqual({ ok: true });

    const [row] = await store.db.select().from(receipts);
    expect(row).toMatchObject({ orderId: order.id, contentType: "image/png", size: 4 });
    expect(row.key).toMatch(new RegExp(`^orders/${order.number}/\\d+-[a-z0-9]+\\.png$`));
    const object = await store.env.RECEIPTS.get(row.key);
    expect(object?.httpMetadata?.contentType).toBe("image/png");
  });

  test("a phone that sends no file type still works from the file's name", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "receipt.heic", { type: "" });
    expect(await saveReceipt(store.db, store.env.RECEIPTS, order, file)).toEqual({ ok: true });
  });

  test("anything but an image or a PDF is turned away", async () => {
    const before = await store.db.$count(receipts);
    const result = await saveReceipt(store.db, store.env.RECEIPTS, order, new File(["hello"], "notes.txt", { type: "text/plain" }));
    expect(result).toMatchObject({ ok: false });
    expect(await store.db.$count(receipts)).toBe(before);
  });

  test("an empty file or one over 10 MB is turned away", async () => {
    expect(await saveReceipt(store.db, store.env.RECEIPTS, order, new File([], "receipt.png", { type: "image/png" }))).toMatchObject({ ok: false });
    const big = new File([new Uint8Array(MAX_RECEIPT_BYTES + 1)], "photo.jpg", { type: "image/jpeg" });
    expect(await saveReceipt(store.db, store.env.RECEIPTS, order, big)).toMatchObject({ ok: false, message: expect.stringContaining("10 MB") });
  });
});

// Sent straight to storage through a signed link (lib/receipt-upload-url.ts): checked before it
// goes, then confirmed once it's there.
describe("receipts sent straight to storage", () => {
  test("the check hands out a key in the order's folder, from the name, type and size alone", () => {
    const check = checkReceipt(order, { name: "Screenshot 2026-10-26 at 2.38.45 PM.png", type: "image/png", size: 620_493 });
    expect(check).toMatchObject({ ok: true, contentType: "image/png" });
    expect(check.ok && isReceiptKeyFor(order, check.key)).toBe(true);
    expect(checkReceipt(order, { name: "notes.txt", type: "text/plain", size: 5 })).toMatchObject({ ok: false });
    expect(checkReceipt(order, { name: "photo.jpg", type: "image/jpeg", size: MAX_RECEIPT_BYTES + 1 })).toMatchObject({ ok: false });
  });

  test("a file that arrived is recorded with the size and type storage has", async () => {
    const check = checkReceipt(order, { name: "receipt.png", type: "image/png", size: 4 });
    if (!check.ok) throw new Error("expected a key");
    await store.env.RECEIPTS.put(check.key, new Uint8Array([137, 80, 78, 71]), { httpMetadata: { contentType: "image/png" } });
    expect(await confirmReceipt(store.db, store.env.RECEIPTS, order, check.key)).toEqual({ ok: true });
    const row = await store.db.query.receipts.findFirst({ where: (receipts, { eq }) => eq(receipts.key, check.key) });
    expect(row).toMatchObject({ orderId: order.id, contentType: "image/png", size: 4 });
  });

  test("nothing is recorded for a file that never arrived, or a key from another order", async () => {
    const before = await store.db.$count(receipts);
    const check = checkReceipt(order, { name: "receipt.png", type: "image/png", size: 4 });
    if (!check.ok) throw new Error("expected a key");
    expect(await confirmReceipt(store.db, store.env.RECEIPTS, order, check.key)).toMatchObject({ ok: false });
    const other = checkReceipt({ number: order.number + 1 }, { name: "receipt.png", type: "image/png", size: 4 });
    if (!other.ok) throw new Error("expected a key");
    await store.env.RECEIPTS.put(other.key, new Uint8Array([1]));
    expect(await confirmReceipt(store.db, store.env.RECEIPTS, order, other.key)).toMatchObject({ ok: false });
    expect(await confirmReceipt(store.db, store.env.RECEIPTS, order, "../secrets.png")).toMatchObject({ ok: false });
    expect(await store.db.$count(receipts)).toBe(before);
  });

  test("one over the limit is deleted, since a link can't stop a big file being sent", async () => {
    const check = checkReceipt(order, { name: "photo.jpg", type: "image/jpeg", size: 1 });
    if (!check.ok) throw new Error("expected a key");
    await store.env.RECEIPTS.put(check.key, new Uint8Array(MAX_RECEIPT_BYTES + 1));
    expect(await confirmReceipt(store.db, store.env.RECEIPTS, order, check.key)).toMatchObject({ ok: false, message: expect.stringContaining("10 MB") });
    expect(await store.env.RECEIPTS.head(check.key)).toBeNull();
  });
});

// The admin's own records of an order, kept beside the customer's payment receipts: the courier's
// shipping receipt, and for cash on delivery the courier's payout voucher and the transfer screenshot.
describe("the admin's own files on an order", () => {
  const png = (name: string) => new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });
  let second: { id: number; number: number; token: string };

  beforeAll(async () => {
    const placed = await placeOrder(store.db, {
      customer: { name: "Bilal Ahmed", email: "bilal@example.com", phone: "+923331112223", city: "Karachi", address: "House 9, DHA", payment: "bank_transfer" },
      lines: [{ variantId: "45831741505607", quantity: 1 }],
    });
    if (!placed.ok) throw new Error("could not place the second test order");
    const row = await store.db.query.orders.findFirst({ where: (orders, { eq }) => eq(orders.token, placed.token) });
    second = { id: row!.id, number: row!.number, token: placed.token };
  });

  test("the voucher and the payout screenshot are for cash on delivery orders; the shipping receipt for any", () => {
    expect(receiptKindFor({ paymentMethod: "cod" }, "voucher")).toBe("voucher");
    expect(receiptKindFor({ paymentMethod: "cod" }, "payout")).toBe("payout");
    expect(receiptKindFor({ paymentMethod: "bank_transfer" }, "voucher")).toBeNull();
    expect(receiptKindFor({ paymentMethod: "bank_transfer" }, "payout")).toBeNull();
    expect(receiptKindFor({ paymentMethod: "bank_transfer" }, "shipping")).toBe("shipping");
    expect(receiptKindFor({ paymentMethod: "cod" }, "shipping")).toBe("shipping");
    expect(receiptKindFor({ paymentMethod: "cod" }, "payment")).toBe("payment");
    expect(receiptKindFor({ paymentMethod: "cod" }, "anything else")).toBeNull();
  });

  test("they stay out of what counts payment receipts: the customer's page, the orders list, the dashboard", async () => {
    expect(await saveReceipt(store.db, store.env.RECEIPTS, second, png("slip.png"), "shipping")).toEqual({ ok: true });
    const kinds = await store.db.select({ kind: receipts.kind }).from(receipts).where(eq(receipts.orderId, second.id));
    expect(kinds).toEqual([{ kind: "shipping" }]);

    expect((await getOrderByToken(store.db, second.token))?.receipts).toEqual([]);
    const listed = (await listOrders(store.db, {})).find((row) => row.number === second.number);
    expect(listed).toMatchObject({ receipts: 0 });
    // Only the first order, with the customer's own receipts, waits with a receipt in.
    expect((await needsAction(store.db)).receiptsWaiting).toBe(1);
  });

  test("a second shipping receipt replaces the first, file and all; the customer's receipts add up", async () => {
    const first = await store.db.query.receipts.findFirst({ where: (rows, { and, eq }) => and(eq(rows.orderId, second.id), eq(rows.kind, "shipping")) });
    expect(await saveReceipt(store.db, store.env.RECEIPTS, second, png("slip-again.png"), "shipping")).toEqual({ ok: true });
    const shipping = await store.db.select().from(receipts).where(eq(receipts.orderId, second.id));
    expect(shipping).toHaveLength(1);
    expect(shipping[0].key).not.toBe(first!.key);
    expect(await store.env.RECEIPTS.head(first!.key)).toBeNull();

    const before = await store.db.$count(receipts, eq(receipts.orderId, order.id));
    expect(await saveReceipt(store.db, store.env.RECEIPTS, order, png("another.png"))).toEqual({ ok: true });
    expect(await store.db.$count(receipts, eq(receipts.orderId, order.id))).toBe(before + 1);
  });

  test("one sent straight to storage is filed under what it is", async () => {
    const check = checkReceipt(second, { name: "voucher.pdf", type: "application/pdf", size: 4 }, "voucher");
    if (!check.ok) throw new Error("expected a key");
    await store.env.RECEIPTS.put(check.key, new Uint8Array([37, 80, 68, 70]), { httpMetadata: { contentType: "application/pdf" } });
    expect(await confirmReceipt(store.db, store.env.RECEIPTS, second, check.key, "voucher")).toEqual({ ok: true });
    const row = await store.db.query.receipts.findFirst({ where: (rows, { eq }) => eq(rows.key, check.key) });
    expect(row).toMatchObject({ orderId: second.id, kind: "voucher", contentType: "application/pdf" });
  });

  test("a file turned away is told what to upload in the admin's words, the customer's stay the same", () => {
    const text = { name: "notes.txt", type: "text/plain", size: 5 };
    expect(checkReceipt(second, text, "shipping")).toEqual({ ok: false, message: "Upload a photo, a screenshot or a PDF." });
    expect(checkReceipt(second, text)).toEqual({ ok: false, message: "Upload a screenshot, a photo or a PDF of the transfer." });
  });
});

