// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import type { CheckoutValues } from "../checkout";
import { createTestDb } from "../db/test-db";
import { discounts } from "../db/schema";
import { placeOrder } from "../orders";
import { deleteDiscount, discountStatus, endOfDay, lastDay, listDiscounts, saveDiscount, setDiscountActive, startOfDay, type DiscountInput } from "./discounts";

const DARK_BROWN_S = "49253873647687";
const customer: CheckoutValues = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  city: "Lahore",
  address: "House 1, Street 2",
  payment: "cod",
};
const input: DiscountInput = {
  code: "eid10",
  kind: "percent",
  value: 10,
  minSubtotal: null,
  startsOn: "",
  endsOn: "",
  usageLimit: null,
  oncePerCustomer: false,
};

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);
afterAll(() => store?.dispose());

describe("admin discounts", () => {
  test("dates are whole Pakistan days, and the form gets back the days it saved", () => {
    expect(startOfDay("2026-11-01").toISOString()).toBe("2026-10-31T19:00:00.000Z");
    expect(endOfDay("2026-11-03").toISOString()).toBe("2026-11-03T19:00:00.000Z");
    expect(lastDay(endOfDay("2026-11-03"))).toBe("2026-11-03");
  });

  test("a code's status follows its switch, dates and uses", () => {
    const now = new Date("2026-10-27T12:00:00+05:00");
    const base = { active: true, startsAt: null, endsAt: null, usageLimit: null };
    expect(discountStatus(base, 0, now)).toBe("active");
    expect(discountStatus({ ...base, active: false }, 0, now)).toBe("off");
    expect(discountStatus({ ...base, startsAt: startOfDay("2026-11-01") }, 0, now)).toBe("scheduled");
    expect(discountStatus({ ...base, endsAt: endOfDay("2026-10-26") }, 0, now)).toBe("ended");
    expect(discountStatus({ ...base, usageLimit: 2 }, 2, now)).toBe("used_up");
  });

  test("codes are checked, stored in capitals, and stay unique", async () => {
    expect(await saveDiscount(store.db, null, { ...input, code: "a b" })).toMatchObject({ ok: false });
    expect(await saveDiscount(store.db, null, { ...input, value: 120 })).toMatchObject({ ok: false });
    expect(await saveDiscount(store.db, null, { ...input, kind: "fixed", value: 0 })).toMatchObject({ ok: false });
    expect(await saveDiscount(store.db, null, { ...input, startsOn: "2026-11-05", endsOn: "2026-11-01" })).toMatchObject({ ok: false });
    expect(await saveDiscount(store.db, null, { ...input, startsOn: "2026-11-01", endsOn: "2026-11-05", usageLimit: 50 })).toEqual({ ok: true });
    expect(await saveDiscount(store.db, null, { ...input, code: "EID10" })).toMatchObject({ ok: false, message: "There's already a code called EID10." });

    const [row] = await listDiscounts(store.db, new Date("2026-10-27T12:00:00+05:00"));
    expect(row).toMatchObject({ code: "EID10", kind: "percent", value: 10, usageLimit: 50, uses: 0, status: "scheduled" });
    expect(lastDay(row.endsAt!)).toBe("2026-11-05");

    // Free delivery has no amount.
    expect(await saveDiscount(store.db, null, { ...input, code: "FREESHIP", kind: "free_delivery", value: 99 })).toEqual({ ok: true });
    expect((await listDiscounts(store.db)).find((discount) => discount.code === "FREESHIP")?.value).toBe(0);
  });

  test("a used code keeps its name and can't be deleted, only turned off", async () => {
    await store.db.insert(discounts).values({ code: "WELCOME", kind: "fixed", value: 1000 });
    const order = await placeOrder(store.db, { customer, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }], discountCode: "welcome" });
    expect(order).toMatchObject({ ok: true });

    const [row] = await listDiscounts(store.db);
    expect(row).toMatchObject({ uses: 1, given: 1000 });
    expect(await saveDiscount(store.db, row.id, { ...input, code: "HELLO", kind: "fixed", value: 1500 })).toMatchObject({ ok: false });
    expect(await saveDiscount(store.db, row.id, { ...input, code: "WELCOME", kind: "fixed", value: 1500 })).toEqual({ ok: true });
    expect(await deleteDiscount(store.db, row.id)).toMatchObject({ ok: false });
    expect(await setDiscountActive(store.db, row.id, false)).toEqual({ ok: true });
    expect((await listDiscounts(store.db))[0]).toMatchObject({ value: 1500, active: false, status: "off" });

    await store.db.insert(discounts).values({ code: "UNUSED", kind: "fixed", value: 500 });
    const unused = (await listDiscounts(store.db)).find((discount) => discount.code === "UNUSED")!;
    expect(await deleteDiscount(store.db, unused.id)).toEqual({ ok: true });
    expect((await listDiscounts(store.db)).map((discount) => discount.code)).toEqual(["WELCOME"]);
  });
});
