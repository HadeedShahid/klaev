import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";

import type { Db } from "./db";
import { discounts, orders, type DISCOUNT_KINDS } from "./db/schema";
import { formatPKR } from "./money";

export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

// What a code takes off an order of this subtotal: rupees off the items, or the delivery fee.
export function discountOff(discount: { kind: DiscountKind; value: number }, subtotal: number) {
  if (discount.kind === "free_delivery") return { amount: 0, freeDelivery: true };
  const amount = discount.kind === "percent" ? Math.round((subtotal * Math.min(discount.value, 100)) / 100) : discount.value;
  return { amount: Math.min(amount, subtotal), freeDelivery: false };
}

export type DiscountCheck =
  | { ok: true; code: string; kind: DiscountKind; value: number; amount: number; freeDelivery: boolean; label: string }
  | { ok: false; message: string };

// "10% off", "PKR 1,000 off", "Free delivery": how a code reads at checkout.
export const discountLabel = (discount: { kind: DiscountKind; value: number }) =>
  discount.kind === "percent" ? `${discount.value}% off` : discount.kind === "fixed" ? `${formatPKR(discount.value)} off` : "Free delivery";

// Whether a code can be used on this order, and what it takes off. The phone, once known, checks
// one-use-per-customer codes. Cancelled orders don't count as uses.
export async function checkDiscount(
  db: Db,
  typed: string,
  { subtotal, phone, now = new Date() }: { subtotal: number; phone?: string; now?: Date },
): Promise<DiscountCheck> {
  const code = typed.trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a code." };
  const [discount] = await db.select().from(discounts).where(eq(discounts.code, code));
  if (!discount || !discount.active) return { ok: false, message: "That code isn't valid." };
  if (discount.startsAt && discount.startsAt > now) return { ok: false, message: "That code isn't valid." };
  if (discount.endsAt && discount.endsAt <= now) return { ok: false, message: "That code has ended." };
  if (discount.minSubtotal !== null && subtotal < discount.minSubtotal) {
    return { ok: false, message: `That code is for orders of ${formatPKR(discount.minSubtotal)} or more.` };
  }
  const used = (where?: ReturnType<typeof eq>) =>
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(eq(orders.discountCode, code), ne(orders.status, "cancelled"), where))
      .then(([row]) => row.count);
  if (discount.usageLimit !== null && (await used()) >= discount.usageLimit) return { ok: false, message: "That code has been used up." };
  if (discount.oncePerCustomer && phone && (await used(eq(orders.phone, phone))) > 0) return { ok: false, message: "You've used that code already." };
  const off = discountOff(discount, subtotal);
  return { ok: true, code, kind: discount.kind, value: discount.value, ...off, label: discountLabel(discount) };
}
