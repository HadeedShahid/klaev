// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { confirmOrder, markDelivered, markPacked, markShipped } from "./admin/orders";
import type { CheckoutValues } from "./checkout";
import { createTestDb } from "./db/test-db";
import { orders } from "./db/schema";
import { placeOrder } from "./orders";
import {
  addCustomerPhoto,
  addReview,
  awaitsReview,
  homeReviews,
  listReviews,
  productReviews,
  readPublished,
  reviewableOrder,
  reviewCounts,
  setFeatured,
  setReviewStatus,
  submitReview,
} from "./reviews";

const BROWN_S = 49253873647687; // Dark brown cropped, 2 in stock
const BLACK_LAMB_M = 42204090892359; // Black lambskin, 1 in stock
const DARK_BROWN = { handle: "dark-brown-cropped-sheepskin-leather-jacket", collection: "cropped-leather-jackets", sizeGuide: {} };
const BURGUNDY = { handle: "burgundy-cropped-leather-jacket", collection: "cropped-leather-jackets", sizeGuide: {} };
const LAMBSKIN = { handle: "black-lambskin-leather-jacket", collection: "leather-jackets", sizeGuide: {} };

const customer: CheckoutValues = {
  name: "Ali Khan",
  email: "ali@example.com",
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

async function delivered(variantIds: number[]) {
  const placed = await placeOrder(store.db, { customer, lines: variantIds.map((id) => ({ variantId: String(id), quantity: 1 })) });
  if (!placed.ok) throw new Error(placed.reason);
  const { number, token } = placed;
  await confirmOrder(store.db, number);
  await markPacked(store.db, number);
  await markShipped(store.db, number, { trackingNumber: "PX-1", courierFee: null });
  await markDelivered(store.db, number);
  return { number, token };
}

const words = { rating: "5", body: "Soft, and it sits right at the waist.", name: "Ali K." };

describe("writing a review", () => {
  test("opens once the order is delivered, one review per jacket, and waits to be published", async () => {
    const placed = await placeOrder(store.db, { customer, lines: [{ variantId: String(BROWN_S), quantity: 1 }] });
    if (!placed.ok) throw new Error(placed.reason);
    const waiting = (await reviewableOrder(store.db, placed.token))!;
    expect(waiting.open).toBe(false);
    expect(await submitReview(store.db, placed.token, waiting.items[0].lineId, words)).toMatchObject({ ok: false });

    const { token } = await delivered([BROWN_S]);
    const order = (await reviewableOrder(store.db, token))!;
    expect(order).toMatchObject({ open: true, city: "Lahore", items: [{ size: "S", colour: "Dark brown", reviewId: null }] });
    expect(awaitsReview(order)).toBe(true);

    const saved = await submitReview(store.db, token, order.items[0].lineId, words);
    expect(saved).toMatchObject({ ok: true });
    expect(await submitReview(store.db, token, order.items[0].lineId, words)).toEqual({ ok: false, message: "This one has a review already. Thank you." });
    expect(awaitsReview((await reviewableOrder(store.db, token))!)).toBe(false);

    const [pending] = await listReviews(store.db, "pending");
    expect(pending).toMatchObject({ rating: 5, name: "Ali K.", city: "Lahore", size: "S", source: "site", orderNumber: expect.any(Number) });
    expect(await readPublished(store.db)).toEqual([]);
  });

  test("a bad rating or a line from another order is turned away", async () => {
    const first = await delivered([BROWN_S]);
    const second = await delivered([BLACK_LAMB_M]);
    const theirs = (await reviewableOrder(store.db, second.token))!.items[0].lineId;
    expect(await submitReview(store.db, first.token, theirs, words)).toEqual({ ok: false, message: "That isn't in this order." });
    expect(await submitReview(store.db, first.token, 0, { ...words, rating: "0" })).toMatchObject({ ok: false, field: "rating" });
    expect(await reviewableOrder(store.db, "not-a-token")).toBeNull();
  });

  test("a photo goes on the customer's own review, once, while it waits", async () => {
    const { token } = await delivered([BROWN_S]);
    const order = (await reviewableOrder(store.db, token))!;
    const saved = await submitReview(store.db, token, order.items[0].lineId, words);
    if (!saved.ok) throw new Error(saved.message);
    const photo = { src: "https://media.klaev.com/reviews/a.webp", width: 800, height: 1000 };

    expect(await addCustomerPhoto(store.db, "x".repeat(24), saved.id, photo)).toBe(false);
    expect(await addCustomerPhoto(store.db, token, saved.id, photo)).toBe(true);
    expect(await addCustomerPhoto(store.db, token, saved.id, photo)).toBe(false);
    expect((await listReviews(store.db, "pending"))[0].photo).toEqual(photo);
  });
});

describe("managing reviews", () => {
  test("Klaev types one in from WhatsApp; it's live at once", async () => {
    const { number } = await delivered([BLACK_LAMB_M]);
    const order = await store.db.query.orders.findFirst({ where: eq(orders.number, number), with: { lines: true } });
    const added = await addReview(store.db, number, order!.lines[0].id, { ...words, source: "whatsapp" });
    expect(added).toMatchObject({ ok: true });
    expect(await reviewCounts(store.db)).toEqual({ pending: 0, published: 1, hidden: 0 });
    expect((await readPublished(store.db))[0]).toMatchObject({ source: "whatsapp", product: { handle: LAMBSKIN.handle, pool: "line:leather-jackets" } });
  });

  test("a line's colours share reviews, this colour's first, with the rating across them", async () => {
    const brown = await delivered([BROWN_S]);
    const brownOrder = (await reviewableOrder(store.db, brown.token))!;
    const a = await submitReview(store.db, brown.token, brownOrder.items[0].lineId, { ...words, rating: "4" });
    const lamb = await delivered([BLACK_LAMB_M]);
    const lambOrder = (await reviewableOrder(store.db, lamb.token))!;
    const b = await submitReview(store.db, lamb.token, lambOrder.items[0].lineId, words);
    if (!a.ok || !b.ok) throw new Error("not saved");
    await setReviewStatus(store.db, a.id, "published");
    await setReviewStatus(store.db, b.id, "published");

    const all = await readPublished(store.db);
    const onBurgundy = productReviews(all, BURGUNDY);
    expect(onBurgundy.reviews.map((review) => review.id)).toEqual([a.id]);
    expect(onBurgundy).toMatchObject({ own: [], allColours: true, summary: { average: 4, count: 1 } });
    const onBrown = productReviews(all, DARK_BROWN);
    expect(onBrown).toMatchObject({ allColours: false, own: [{ id: a.id }] });
    expect(productReviews(all, LAMBSKIN).reviews.map((review) => review.id)).toEqual([b.id]);
  });

  test("hiding takes a review off the store and the home page; only published ones can be picked", async () => {
    const { token } = await delivered([BROWN_S]);
    const order = (await reviewableOrder(store.db, token))!;
    const saved = await submitReview(store.db, token, order.items[0].lineId, words);
    if (!saved.ok) throw new Error(saved.message);

    expect(await setFeatured(store.db, saved.id, true)).toBe(false);
    await setReviewStatus(store.db, saved.id, "published");
    expect(await setFeatured(store.db, saved.id, true)).toBe(true);
    expect((await readPublished(store.db))[0].featured).toBe(true);

    await setReviewStatus(store.db, saved.id, "hidden");
    expect(await readPublished(store.db)).toEqual([]);
    expect((await listReviews(store.db, "hidden"))[0].featured).toBe(false);
    expect(homeReviews([])).toBeNull();
  });
});
