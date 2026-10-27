import "server-only";

import { eq } from "drizzle-orm";

import type { Db } from "../db";
import { settings } from "../db/schema";
import type { Result } from "./orders";

// What the courier charges upfront per parcel, and the tax it keeps from COD cash at payout. The
// rates vary with weight and city, so these are defaults each order starts from (settings table).
export type CourierSettings = { prepaidCharge: number; codCharge: number; codTaxPercent: number };

export const COURIER_DEFAULTS: CourierSettings = { prepaidCharge: 310, codCharge: 590, codTaxPercent: 4 };

const KEY = "courier";

export async function getCourierSettings(db: Db): Promise<CourierSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, KEY) });
  const value = (row?.value ?? {}) as Partial<CourierSettings>;
  const pick = (name: keyof CourierSettings) =>
    Number.isFinite(value[name]) ? (value[name] as number) : COURIER_DEFAULTS[name];
  return { prepaidCharge: pick("prepaidCharge"), codCharge: pick("codCharge"), codTaxPercent: pick("codTaxPercent") };
}

export async function saveCourierSettings(db: Db, values: CourierSettings): Promise<Result> {
  const rupees = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= 100_000;
  if (!rupees(values.prepaidCharge) || !rupees(values.codCharge)) return { ok: false, message: "Charges are whole numbers of rupees." };
  if (!(values.codTaxPercent >= 0 && values.codTaxPercent <= 20)) return { ok: false, message: "The tax is a percentage from 0 to 20." };
  await db
    .insert(settings)
    .values({ key: KEY, value: values })
    .onConflictDoUpdate({ target: settings.key, set: { value: values, updatedAt: new Date() } });
  return { ok: true };
}

// What the courier should pay out for COD cash it collected: the amount less the tax it keeps.
export function expectedPayout(collected: number, codTaxPercent: number) {
  return collected - Math.round((collected * codTaxPercent) / 100);
}
