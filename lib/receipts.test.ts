// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "./db/test-db";
import { receipts } from "./db/schema";
import { placeOrder } from "./orders";
import { checkReceipt, confirmReceipt, isReceiptKeyFor, MAX_RECEIPT_BYTES, saveReceipt } from "./receipts";

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
