// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "./db/test-db";
import { receipts } from "./db/schema";
import { placeOrder } from "./orders";
import { MAX_RECEIPT_BYTES, saveReceipt } from "./receipts";

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
