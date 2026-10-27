import "server-only";

import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";

import type { Db } from "./db";
import { checkouts } from "./db/schema";

// A checkout counts as abandoned once it has sat this long without an order, and drops off the
// list after a month.
export const ABANDONED_AFTER_MINUTES = 10;
const KEPT_DAYS = 30;

export type CheckoutLine = { variantId: number; title: string; size: string | null; quantity: number; price: number };

// What someone has typed at checkout so far, with their cart, saved under their browser's token
// once the phone number is in. Saving again updates the same checkout.
export async function saveCheckout(
  db: Db,
  token: string,
  input: { name: string; email: string; phone: string; city: string; address: string; lines: CheckoutLine[] },
) {
  if (input.lines.length === 0) return;
  const values = {
    name: input.name.trim().slice(0, 120) || null,
    email: input.email.trim().toLowerCase().slice(0, 200) || null,
    phone: input.phone,
    city: input.city.trim().slice(0, 80) || null,
    address: input.address.trim().slice(0, 500) || null,
    lines: input.lines,
    subtotal: input.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
  };
  await db
    .insert(checkouts)
    .values({ token, ...values })
    .onConflictDoUpdate({ target: checkouts.token, set: { ...values, updatedAt: new Date() }, where: isNull(checkouts.orderId) });
}

// The order that came of it.
export async function checkoutOrdered(db: Db, token: string, orderNumber: number) {
  await db
    .update(checkouts)
    .set({ orderId: sql`(SELECT id FROM orders WHERE number = ${orderNumber})`, updatedAt: new Date() })
    .where(and(eq(checkouts.token, token), isNull(checkouts.orderId)));
}

// Checkouts left without an order, newest first. One from a phone that has ordered since counts as
// recovered, whichever browser the order came from.
export async function listAbandoned(db: Db, now = new Date()) {
  return db
    .select()
    .from(checkouts)
    .where(
      and(
        isNull(checkouts.orderId),
        lt(checkouts.updatedAt, new Date(now.getTime() - ABANDONED_AFTER_MINUTES * 60_000)),
        gt(checkouts.updatedAt, new Date(now.getTime() - KEPT_DAYS * 86_400_000)),
        sql`NOT EXISTS (SELECT 1 FROM orders WHERE orders.phone = checkouts.phone AND orders.created_at >= checkouts.created_at)`,
      ),
    )
    .orderBy(desc(checkouts.updatedAt))
    .limit(200);
}

export type AbandonedCheckout = Awaited<ReturnType<typeof listAbandoned>>[number];

export async function markContacted(db: Db, id: number) {
  await db.update(checkouts).set({ contactedAt: new Date() }).where(eq(checkouts.id, id));
}
