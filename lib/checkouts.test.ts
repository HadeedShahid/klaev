// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { checkoutOrdered, listAbandoned, markContacted, saveCheckout } from "./checkouts";
import type { CheckoutValues } from "./checkout";
import { createTestDb } from "./db/test-db";
import { placeOrder, trackOrder } from "./orders";
import { confirmOrder, markShipped, setCourierStatus } from "./admin/orders";

const DARK_BROWN_S = "49253873647687";
const lines = [{ variantId: Number(DARK_BROWN_S), title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "S", quantity: 1, price: 17999 }];
const contact = { name: "Ayesha Khan", email: "Ayesha@example.com", phone: "+923001234567", city: "Lahore", address: "House 1" };
const customer: CheckoutValues = { ...contact, email: "ayesha@example.com", payment: "cod" };
const later = (minutes: number) => new Date(Date.now() + minutes * 60_000);

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);
afterAll(() => store?.dispose());

describe("abandoned checkouts", () => {
  test("a checkout left for 10 minutes is abandoned; saving again updates the same one", async () => {
    await saveCheckout(store.db, "browser-a", { ...contact, name: "Ayesha", lines });
    await saveCheckout(store.db, "browser-a", { ...contact, lines });
    expect(await listAbandoned(store.db, later(5))).toEqual([]);
    const [row] = await listAbandoned(store.db, later(11));
    expect(row).toMatchObject({ name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567", subtotal: 17999, contactedAt: null });
    expect(await listAbandoned(store.db, later(60 * 24 * 31))).toEqual([]);

    await markContacted(store.db, row.id);
    expect((await listAbandoned(store.db, later(11)))[0].contactedAt).toBeInstanceOf(Date);
  });

  test("an order, from this browser or any other with the same phone, recovers it", async () => {
    await saveCheckout(store.db, "browser-a", { ...contact, lines });
    await saveCheckout(store.db, "browser-b", { ...contact, phone: "+923331112223", lines });
    const placed = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
    if (!placed.ok) throw new Error("not placed");
    // browser-a's phone ordered (say, from another phone's browser): recovered without linking.
    expect((await listAbandoned(store.db, later(11))).map((row) => row.phone)).toEqual(["+923331112223"]);

    await checkoutOrdered(store.db, "browser-b", placed.number);
    expect(await listAbandoned(store.db, later(11))).toEqual([]);
    // A linked checkout isn't overwritten by a later save.
    await saveCheckout(store.db, "browser-b", { ...contact, phone: "+923331112223", name: "Changed", lines });
    expect(await listAbandoned(store.db, later(11))).toEqual([]);
  });
});

describe("tracking an order", () => {
  test("needs the number and the phone it was placed with, and shows where the parcel is", async () => {
    const placed = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
    if (!placed.ok) throw new Error("not placed");
    expect(await trackOrder(store.db, placed.number, "0300 0000000")).toBeNull();
    expect(await trackOrder(store.db, placed.number, "0300 1234567")).toMatchObject({ number: placed.number, status: "pending", courierStatus: null });

    await confirmOrder(store.db, placed.number);
    await markShipped(store.db, placed.number, { trackingNumber: "PX-77", courierFee: 590 });
    await setCourierStatus(store.db, placed.number, "out_for_delivery");
    const tracked = await trackOrder(store.db, placed.number, "+92 300 1234567");
    expect(tracked).toMatchObject({ status: "shipped", courierStatus: "out_for_delivery", trackingNumber: "PX-77", city: "Lahore" });
    expect(tracked?.lines).toEqual([{ title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "S", quantity: 1 }]);
    expect(tracked).not.toHaveProperty("address1");
    expect(tracked).not.toHaveProperty("token");
  });
});
