// @vitest-environment node
import { afterAll, beforeEach, expect, test } from "vitest";

import { createTestDb } from "./db/test-db";
import { checkouts, events, messages } from "./db/schema";
import { forgetOldData } from "./retention";

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
}, 60_000);
afterAll(() => store?.dispose());

const NOW = new Date("2026-10-27T12:00:00+05:00");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

test("old page views, unfinished checkouts and handled messages go; recent ones stay", async () => {
  const view = { type: "view" as const, visitorId: "visitor000001", sessionId: "session000001", path: "/" };
  await store.db.insert(events).values([
    { ...view, createdAt: daysAgo(400) },
    { ...view, createdAt: daysAgo(10) },
  ]);
  const lines = [{ variantId: 1, title: "Jacket", size: "M", quantity: 1, price: 17999 }];
  await store.db.insert(checkouts).values([
    { token: "old-checkout-token", phone: "+923001234567", lines, subtotal: 17999, updatedAt: daysAgo(40) },
    { token: "new-checkout-token", phone: "+923001234567", lines, subtotal: 17999, updatedAt: daysAgo(5) },
  ]);
  await store.db.insert(messages).values([
    { name: "Old", phone: "+923001234567", body: "Hi", handledAt: daysAgo(400), createdAt: daysAgo(401) },
    { name: "Waiting", phone: "+923001234567", body: "Hi", createdAt: daysAgo(400) },
  ]);
  await forgetOldData(store.db, NOW);
  expect(await store.db.select().from(events)).toHaveLength(1);
  expect((await store.db.select().from(checkouts)).map((row) => row.token)).toEqual(["new-checkout-token"]);
  // A message nobody has handled stays, however old.
  expect((await store.db.select().from(messages)).map((row) => row.name)).toEqual(["Waiting"]);
});
