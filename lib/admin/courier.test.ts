// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { createTestDb } from "../db/test-db";
import { COURIER_DEFAULTS, expectedPayout, getCourierSettings, saveCourierSettings } from "./courier";

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
}, 60_000);
afterAll(() => store?.dispose());

describe("courier settings", () => {
  test("start from today's rates, and keep what's saved", async () => {
    expect(await getCourierSettings(store.db)).toEqual(COURIER_DEFAULTS);
    expect(await saveCourierSettings(store.db, { prepaidCharge: 330, codCharge: 480, codTaxPercent: 4 })).toEqual({ ok: true });
    expect(await getCourierSettings(store.db)).toEqual({ prepaidCharge: 330, codCharge: 480, codTaxPercent: 4 });
    expect(await saveCourierSettings(store.db, { prepaidCharge: -1, codCharge: 480, codTaxPercent: 4 })).toMatchObject({ ok: false });
    expect(await saveCourierSettings(store.db, { prepaidCharge: 310, codCharge: 480, codTaxPercent: 50 })).toMatchObject({ ok: false });
  });

  test("a payout is the COD cash less the courier's 4%, to the rupee", () => {
    expect(expectedPayout(16899, 4)).toBe(16223);
    expect(expectedPayout(15999, 4)).toBe(15359);
    expect(expectedPayout(10000, 0)).toBe(10000);
  });
});
