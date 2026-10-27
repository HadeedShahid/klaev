import "server-only";

import { and, desc, eq, like, ne, or, sql, type SQL } from "drizzle-orm";

import type { Db } from "../db";
import { customers, orders } from "../db/schema";
import { normalizePhone } from "../phone";
import type { Result } from "./orders";

// Shopify's customer segments, kept to the ones a small COD store acts on.
export const CUSTOMER_SEGMENTS = ["first_time", "repeat", "lapsed", "refused"] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];
// No order for this long and a customer counts as lapsed: someone to win back.
export const LAPSED_DAYS = 90;

// Per customer, over their orders. Cancelled orders don't count as orders. Money spent counts only
// orders confirmed onwards: one still waiting for its advance may never come, and a refused one
// came back.
const orderCount = sql<number>`COUNT(CASE WHEN ${orders.status} != 'cancelled' THEN 1 END)`;
const spent = sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('pending', 'cancelled', 'refused') THEN ${orders.total} END), 0)`;
const lastOrderAt = sql<number | null>`MAX(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.createdAt} END)`;
const refused = sql<number>`COUNT(CASE WHEN ${orders.status} = 'refused' THEN 1 END)`;

const lapsedBefore = (now: Date) => Math.floor(now.getTime() / 1000) - LAPSED_DAYS * 86_400;

function segmentHaving(segment: CustomerSegment | undefined, now: Date): SQL | undefined {
  if (segment === "first_time") return sql`${orderCount} = 1`;
  if (segment === "repeat") return sql`${orderCount} >= 2`;
  if (segment === "lapsed") return sql`${orderCount} >= 1 AND ${lastOrderAt} < ${lapsedBefore(now)}`;
  if (segment === "refused") return sql`${refused} >= 1`;
  return undefined;
}

function matching(query: string): SQL | undefined {
  const text = query.trim();
  if (!text) return undefined;
  const conditions: SQL[] = [like(customers.name, `%${text}%`), like(customers.email, `%${text.toLowerCase()}%`)];
  const phone = normalizePhone(text);
  if (phone) conditions.push(eq(customers.phone, phone));
  return or(...conditions);
}

// Customers with their orders, spend and last order, the most recent buyers first.
export async function listCustomers(
  db: Db,
  { segment, query = "", limit = 50, offset = 0, now = new Date() }: { segment?: CustomerSegment; query?: string; limit?: number; offset?: number; now?: Date },
) {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      city: customers.city,
      tags: customers.tags,
      orders: orderCount,
      spent,
      lastOrderAt,
      refused,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(matching(query))
    .groupBy(customers.id)
    .having(segmentHaving(segment, now))
    .orderBy(sql`${lastOrderAt} IS NULL`, desc(lastOrderAt), desc(customers.id))
    .limit(limit)
    .offset(offset);
  return rows.map((row) => ({ ...row, lastOrderAt: row.lastOrderAt === null ? null : new Date(row.lastOrderAt * 1000) }));
}

export type CustomerRow = Awaited<ReturnType<typeof listCustomers>>[number];

export async function countCustomers(db: Db, { segment, query = "", now = new Date() }: { segment?: CustomerSegment; query?: string; now?: Date }) {
  const matches = db
    .select({ id: customers.id })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(matching(query))
    .groupBy(customers.id)
    .having(segmentHaving(segment, now))
    .as("matches");
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(matches);
  return row.count;
}

// How many customers each segment holds, for the tabs.
export async function customerCounts(db: Db, now = new Date()) {
  const perCustomer = db
    .select({
      orders: orderCount.as("orders"),
      lastOrderAt: lastOrderAt.as("last_order_at"),
      refused: refused.as("refused"),
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .groupBy(customers.id)
    .as("per_customer");
  const [row] = await db
    .select({
      all: sql<number>`COUNT(*)`,
      first_time: sql<number>`COALESCE(SUM(${perCustomer.orders} = 1), 0)`,
      repeat: sql<number>`COALESCE(SUM(${perCustomer.orders} >= 2), 0)`,
      lapsed: sql<number>`COALESCE(SUM(${perCustomer.orders} >= 1 AND ${perCustomer.lastOrderAt} < ${lapsedBefore(now)}), 0)`,
      refused: sql<number>`COALESCE(SUM(${perCustomer.refused} >= 1), 0)`,
    })
    .from(perCustomer);
  return row;
}

// One customer with every order they placed, newest first, and what those add up to.
export async function getCustomer(db: Db, id: number) {
  if (!Number.isSafeInteger(id)) return null;
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  if (!customer) return null;
  const history = await db
    .select({
      number: orders.number,
      createdAt: orders.createdAt,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      total: orders.total,
      city: orders.city,
      items: sql<number>`(SELECT COALESCE(SUM(quantity), 0) FROM order_lines WHERE order_lines.order_id = orders.id)`,
    })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.number));
  const counted = history.filter((order) => order.status !== "cancelled");
  const kept = counted.filter((order) => order.status !== "refused" && order.status !== "pending");
  const spentTotal = kept.reduce((sum, order) => sum + order.total, 0);
  return {
    ...customer,
    orders: history,
    stats: {
      orders: counted.length,
      spent: spentTotal,
      average: kept.length ? Math.round(spentTotal / kept.length) : 0,
      refused: history.filter((order) => order.status === "refused").length,
      cancelled: history.length - counted.length,
      firstOrderAt: counted.at(-1)?.createdAt ?? null,
      lastOrderAt: counted[0]?.createdAt ?? null,
    },
  };
}

export type AdminCustomer = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

// What the order page shows about who placed it: their other orders, and any they refused at the door.
export async function customerHistory(db: Db, order: { id: number; customerId: number | null; phone: string | null }) {
  const same = order.customerId !== null ? eq(orders.customerId, order.customerId) : order.phone ? eq(orders.phone, order.phone) : null;
  if (!same) return { orders: 0, refused: 0 };
  const [row] = await db
    .select({ orders: sql<number>`COUNT(CASE WHEN ${orders.status} != 'cancelled' THEN 1 END)`, refused })
    .from(orders)
    .where(and(same, ne(orders.id, order.id)));
  return row;
}

export type CustomerInput = { name: string; email: string; phone: string; city: string; address1: string; tags: string; note: string };

// The customer's own record. Orders keep the details they were placed with.
export async function saveCustomer(db: Db, id: number, input: CustomerInput): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Enter their name." };
  const email = input.email.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "That email doesn't look right." };
  const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
  if (input.phone.trim() && !phone) return { ok: false, message: "Enter a mobile number, like 0300 1234567." };
  if (email) {
    const [other] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.email, email), ne(customers.id, id)));
    if (other) return { ok: false, message: "Another customer has that email." };
  }
  const [row] = await db
    .update(customers)
    .set({
      name,
      email,
      phone,
      city: input.city.trim() || null,
      address1: input.address1.trim() || null,
      tags: input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      note: input.note.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning({ id: customers.id });
  return row ? { ok: true } : { ok: false, message: "That customer isn't there any more." };
}
