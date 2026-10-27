import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";

import type { Db } from "../db";
import { discounts, orders } from "../db/schema";
import type { DiscountKind } from "../discounts";
import type { Result } from "./orders";

export type DiscountStatus = "active" | "scheduled" | "ended" | "used_up" | "off";

const fail = (message: string) => ({ ok: false as const, message });

// Dates are typed as Pakistan days: a code starts at the first minute of its start day and ends
// after the last minute of its end day.
export const startOfDay = (day: string) => new Date(`${day}T00:00:00+05:00`);
export const endOfDay = (day: string) => new Date(startOfDay(day).getTime() + 86_400_000);
// The day a stored end falls on, for the form: the day before the moment it ends.
export const lastDay = (endsAt: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(endsAt.getTime() - 1));
export const firstDay = (startsAt: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(startsAt);

export function discountStatus(
  discount: { active: boolean; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null },
  uses: number,
  now = new Date(),
): DiscountStatus {
  if (!discount.active) return "off";
  if (discount.endsAt && discount.endsAt <= now) return "ended";
  if (discount.usageLimit !== null && uses >= discount.usageLimit) return "used_up";
  if (discount.startsAt && discount.startsAt > now) return "scheduled";
  return "active";
}

// Every code, newest first, with how many orders used it (cancelled ones don't count) and what
// those orders took off.
export async function listDiscounts(db: Db, now = new Date()) {
  const rows = await db
    .select({
      discount: discounts,
      uses: sql<number>`(SELECT COUNT(*) FROM orders WHERE orders.discount_code = discounts.code AND orders.status != 'cancelled')`,
      given: sql<number>`(SELECT COALESCE(SUM(discount_total), 0) FROM orders WHERE orders.discount_code = discounts.code AND orders.status != 'cancelled')`,
    })
    .from(discounts)
    .orderBy(desc(discounts.createdAt), desc(discounts.id));
  return rows.map(({ discount, uses, given }) => ({ ...discount, uses, given, status: discountStatus(discount, uses, now) }));
}

export type DiscountRow = Awaited<ReturnType<typeof listDiscounts>>[number];

export type DiscountInput = {
  code: string;
  kind: DiscountKind;
  value: number;
  minSubtotal: number | null;
  startsOn: string;
  endsOn: string;
  usageLimit: number | null;
  oncePerCustomer: boolean;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// A new code, or changes to one. A code that orders have used keeps its name, because those
// orders carry it.
export async function saveDiscount(db: Db, id: number | null, input: DiscountInput): Promise<Result> {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return fail("A code is 3 to 30 letters or numbers, with no spaces.");
  if (input.kind === "percent" && !(Number.isSafeInteger(input.value) && input.value >= 1 && input.value <= 100)) {
    return fail("A percentage off is a whole number from 1 to 100.");
  }
  if (input.kind === "fixed" && !(Number.isSafeInteger(input.value) && input.value > 0)) return fail("The amount off is a whole number of rupees.");
  if (input.minSubtotal !== null && !(Number.isSafeInteger(input.minSubtotal) && input.minSubtotal > 0)) {
    return fail("The minimum order is a whole number of rupees, or leave it empty.");
  }
  if (input.usageLimit !== null && !(Number.isSafeInteger(input.usageLimit) && input.usageLimit > 0)) {
    return fail("The number of uses is a whole number, or leave it empty for no limit.");
  }
  if ((input.startsOn && !DAY.test(input.startsOn)) || (input.endsOn && !DAY.test(input.endsOn))) return fail("Choose the dates from the calendar.");
  const startsAt = input.startsOn ? startOfDay(input.startsOn) : null;
  const endsAt = input.endsOn ? endOfDay(input.endsOn) : null;
  if (startsAt && endsAt && endsAt <= startsAt) return fail("The end date is before the start date.");

  const [taken] = await db
    .select({ id: discounts.id })
    .from(discounts)
    .where(and(eq(discounts.code, code), id === null ? undefined : ne(discounts.id, id)));
  if (taken) return fail(`There's already a code called ${code}.`);

  const values = {
    code,
    kind: input.kind,
    value: input.kind === "free_delivery" ? 0 : input.value,
    minSubtotal: input.minSubtotal,
    startsAt,
    endsAt,
    usageLimit: input.usageLimit,
    oncePerCustomer: input.oncePerCustomer,
    updatedAt: new Date(),
  };
  if (id === null) {
    await db.insert(discounts).values(values);
    return { ok: true };
  }
  const [current] = await db.select({ code: discounts.code }).from(discounts).where(eq(discounts.id, id));
  if (!current) return fail("That code isn't there any more.");
  if (current.code !== code && (await usesOf(db, current.code)) > 0) {
    return fail(`Orders have used ${current.code}, so it keeps its name. Make a new code instead.`);
  }
  await db.update(discounts).set(values).where(eq(discounts.id, id));
  return { ok: true };
}

const usesOf = async (db: Db, code: string) =>
  (
    await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(eq(orders.discountCode, code), ne(orders.status, "cancelled")))
  )[0].count;

export async function setDiscountActive(db: Db, id: number, active: boolean): Promise<Result> {
  const [row] = await db.update(discounts).set({ active, updatedAt: new Date() }).where(eq(discounts.id, id)).returning({ id: discounts.id });
  return row ? { ok: true } : fail("That code isn't there any more.");
}

// Only a code no order has used can go; a used one is turned off instead, so its orders keep it.
export async function deleteDiscount(db: Db, id: number): Promise<Result> {
  const [row] = await db.select({ code: discounts.code }).from(discounts).where(eq(discounts.id, id));
  if (!row) return { ok: true };
  if ((await usesOf(db, row.code)) > 0) return fail(`Orders have used ${row.code}. Turn it off instead.`);
  await db.delete(discounts).where(eq(discounts.id, id));
  return { ok: true };
}
