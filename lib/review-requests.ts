import { and, eq, gt, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { Db } from "./db";
import * as schema from "./db/schema";
import { orderLines, orders } from "./db/schema";
import { sendEmail, type Mailer } from "./email";
import { reviewRequestEmail } from "./emails/customer";
import { STORE } from "./store";

// The "How is it fitting?" email, sent by the Worker's daily schedule (worker.ts, the cron in
// wrangler.jsonc). It runs outside Next, so this module reaches the database without lib/db.

const DAY_MS = 86_400_000;

// Orders delivered a week ago or more (but within the month) with an email and a private link, never
// asked before and not reviewed yet. Exchanges are reviewed through the order they replaced.
export async function dueReviewRequests(db: Db, now = new Date()) {
  const due = await db
    .select({ id: orders.id, number: orders.number, token: orders.token, email: orders.email })
    .from(orders)
    .where(
      and(
        eq(orders.status, "delivered"),
        ne(orders.source, "exchange"),
        isNotNull(orders.token),
        isNotNull(orders.email),
        isNull(orders.reviewAskedAt),
        lte(orders.deliveredAt, new Date(now.getTime() - 7 * DAY_MS)),
        gt(orders.deliveredAt, new Date(now.getTime() - 30 * DAY_MS)),
        sql`NOT EXISTS (SELECT 1 FROM reviews WHERE reviews.order_id = orders.id)`,
      ),
    );
  if (due.length === 0) return [];
  const lines = await db
    .select({ orderId: orderLines.orderId, title: orderLines.title })
    .from(orderLines)
    .where(inArray(orderLines.orderId, due.map((order) => order.id)));
  return due.map((order) => ({ ...order, token: order.token!, email: order.email!, lines: lines.filter((line) => line.orderId === order.id) }));
}

// Sends each one once. A send that fails is tried again the next day, while the order is in the window.
export async function sendReviewRequests(database: D1Database, mailer: Mailer | undefined, now = new Date()) {
  const db = drizzle(database, { schema, casing: "snake_case" });
  let sent = 0;
  for (const order of await dueReviewRequests(db, now)) {
    if (!(await sendEmail(mailer, { to: order.email, ...reviewRequestEmail(order, { site: STORE.siteUrl }) }))) continue;
    await db.update(orders).set({ reviewAskedAt: now }).where(eq(orders.id, order.id));
    sent += 1;
  }
  return sent;
}
