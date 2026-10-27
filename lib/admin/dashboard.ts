import "server-only";

import { and, asc, eq, gte, inArray, isNull, lt, lte, notInArray, sql } from "drizzle-orm";

import type { Db } from "../db";
import { orders, products, variants } from "../db/schema";
import { orderProfit, outstanding } from "./orders";

const DAY = 24 * 60 * 60 * 1000;
// Orders that didn't sell: they count in no total.
const UNSOLD = ["cancelled", "refused"] as const;
// A parcel out this long without being marked delivered needs a look.
const OVERDUE_DAYS = 5;

// A date as Pakistan sees it (2026-10-27), wherever the page renders.
const karachiDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(date);

// Sales and orders for each of the last `days` days in Pakistan time, today last, every day present.
export async function salesByDay(db: Db, days: number, now = new Date()) {
  const since = new Date(now.getTime() - days * DAY);
  const day = sql<string>`date(${orders.createdAt}, 'unixepoch', '+5 hours')`;
  const rows = await db
    .select({ date: day, sales: sql<number>`SUM(${orders.total})`, orders: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(gte(orders.createdAt, since), notInArray(orders.status, [...UNSOLD])))
    .groupBy(day);
  return Array.from({ length: days }, (_, index) => {
    const date = karachiDate(new Date(now.getTime() - (days - 1 - index) * DAY));
    const row = rows.find((candidate) => candidate.date === date);
    return { date, sales: row?.sales ?? 0, orders: row?.orders ?? 0 };
  });
}

async function totals(db: Db, from: Date, to: Date) {
  const [row] = await db
    .select({ sales: sql<number>`COALESCE(SUM(${orders.total}), 0)`, orders: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(gte(orders.createdAt, from), lt(orders.createdAt, to), notInArray(orders.status, [...UNSOLD])));
  return row;
}

// The overview's figures for the last `days` days, each beside the same span before it.
export async function dashboardSummary(db: Db, days: number, now = new Date(), codTaxPercent = 4) {
  const since = new Date(now.getTime() - days * DAY);
  const before = new Date(now.getTime() - 2 * days * DAY);
  const [current, previous, withCourier, delivered] = await Promise.all([
    totals(db, since, new Date(now.getTime() + 1)),
    totals(db, before, since),
    db
      .select({
        amount: sql<number>`COALESCE(SUM(${orders.total} - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.order_id = orders.id)), 0)`,
        orders: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(eq(orders.paymentMethod, "cod"), eq(orders.status, "delivered"), isNull(orders.paidOutAt), outstanding)),
    db.query.orders.findMany({
      // Raw SQL doesn't convert dates the way a timestamp column does, so this compares Unix seconds.
      where: and(
        inArray(orders.status, ["delivered", "refused"]),
        sql`COALESCE(${orders.deliveredAt}, ${orders.refusedAt}) >= ${Math.floor(since.getTime() / 1000)}`,
      ),
      with: { lines: { columns: { costPrice: true, quantity: true } }, payments: { columns: { amount: true } } },
    }),
  ]);
  const profits = delivered.map((order) =>
    orderProfit({ ...order, paid: order.payments.reduce((sum, payment) => sum + payment.amount, 0) }, codTaxPercent),
  );
  const average = (row: { sales: number; orders: number }) => (row.orders ? Math.round(row.sales / row.orders) : 0);
  return {
    sales: { current: current.sales, previous: previous.sales },
    orders: { current: current.orders, previous: previous.orders },
    averageOrder: { current: average(current), previous: average(previous) },
    cashWithCourier: withCourier[0],
    profit: {
      amount: profits.reduce((sum, profit) => sum + profit.profit, 0),
      orders: profits.length,
      // Orders whose jacket cost isn't set: the profit leaves that cost out.
      missingCost: profits.filter((profit) => profit.costMissing).length,
      estimated: profits.some((profit) => !profit.complete),
    },
  };
}

// What's waiting on the owner, and the sizes down to their last piece.
export async function needsAction(db: Db, now = new Date()) {
  const count = (where: ReturnType<typeof and>) =>
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(where)
      .then(([row]) => row.count);
  const [toConfirm, receiptsWaiting, toShip, overdue, withCourier, lowStock] = await Promise.all([
    count(eq(orders.status, "pending")),
    count(and(eq(orders.status, "pending"), sql`EXISTS (SELECT 1 FROM receipts WHERE receipts.order_id = orders.id)`)),
    count(inArray(orders.status, ["confirmed", "packed"])),
    count(and(eq(orders.status, "shipped"), lte(orders.shippedAt, new Date(now.getTime() - OVERDUE_DAYS * DAY)))),
    count(and(eq(orders.paymentMethod, "cod"), eq(orders.status, "delivered"), isNull(orders.paidOutAt), outstanding)),
    db
      .select({ title: products.title, handle: products.handle, size: variants.size, stock: variants.stock })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(products.status, "active"), lte(variants.stock, 1)))
      .orderBy(asc(variants.stock), asc(products.position), asc(variants.position)),
  ]);
  return { toConfirm, receiptsWaiting, toShip, overdue, withCourier, lowStock };
}
