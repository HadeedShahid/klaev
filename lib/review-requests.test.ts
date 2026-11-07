// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { confirmOrder, markDelivered, markPacked, markShipped } from "./admin/orders";
import type { CheckoutValues } from "./checkout";
import { createTestDb } from "./db/test-db";
import { orders } from "./db/schema";
import { reviewRequestEmail } from "./emails/customer";
import { placeOrder } from "./orders";
import { dueReviewRequests, sendReviewRequests } from "./review-requests";
import { reviewableOrder, submitReview } from "./reviews";

const BROWN = { S: 49253873647687, M: 49253873680455 };
const DAY = 86_400_000;
const now = new Date("2026-11-20T06:00:00Z");

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

async function deliveredAgo(days: number, variantId = BROWN.S, extra: Partial<CheckoutValues> = {}) {
  const placed = await placeOrder(store.db, { customer: { ...customer, ...extra }, lines: [{ variantId: String(variantId), quantity: 1 }] });
  if (!placed.ok) throw new Error(placed.reason);
  await confirmOrder(store.db, placed.number);
  await markPacked(store.db, placed.number);
  await markShipped(store.db, placed.number, { trackingNumber: "PX-1", courierFee: null });
  await markDelivered(store.db, placed.number);
  await store.db.update(orders).set({ deliveredAt: new Date(now.getTime() - days * DAY) }).where(eq(orders.number, placed.number));
  return placed;
}

describe("asking for a review", () => {
  test("a week after delivery, within the month, once, and not once they've reviewed", async () => {
    const week = await deliveredAgo(7.5);
    await deliveredAgo(3, BROWN.M); // too soon
    expect((await dueReviewRequests(store.db, now)).map((order) => order.number)).toEqual([week.number]);

    const sent: { to: string; subject: string; text: string }[] = [];
    const mailer = { send: async (message: { to: string; subject: string; text: string }) => void sent.push(message) };
    expect(await sendReviewRequests(store.database, mailer as never, now)).toBe(1);
    expect(sent[0]).toMatchObject({ to: "ali@example.com", subject: "How is it fitting?" });
    expect(sent[0].text).toContain(`https://klaev.com/orders/${week.token}/review`);
    expect(await sendReviewRequests(store.database, mailer as never, now)).toBe(0);
  });

  test("nobody is asked twice: a review already in, no email, or a month gone", async () => {
    const reviewed = await deliveredAgo(8);
    const order = (await reviewableOrder(store.db, reviewed.token))!;
    await submitReview(store.db, reviewed.token, order.items[0].lineId, { rating: "5", body: "", name: "Ali" });
    await deliveredAgo(40, BROWN.M);
    expect(await dueReviewRequests(store.db, now)).toEqual([]);
  });

  test("a send that fails is tried again the next day", async () => {
    await deliveredAgo(8);
    expect(await sendReviewRequests(store.database, undefined, now)).toBe(0);
    expect(await dueReviewRequests(store.db, new Date(now.getTime() + DAY))).toHaveLength(1);
  });

  test("the email names the jacket and links to the review page", () => {
    const email = reviewRequestEmail({ number: 1030, token: "abc", lines: [{ title: "Dark Brown Cropped Sheepskin Leather Jacket" }] }, { site: "https://klaev.com" });
    expect(email.text).toContain("Your Dark Brown Cropped Sheepskin Leather Jacket arrived about a week ago.");
    expect(email.html).toContain("https://klaev.com/orders/abc/review");
    expect(email.text).not.toMatch(/[–—]/);
  });
});
