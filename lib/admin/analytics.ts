import "server-only";

import { sql } from "drizzle-orm";

import { SOURCE_LABELS, type Source } from "../analytics-source";
import type { Db } from "../db";
import { PAYMENT_LABELS } from "./labels";
import { orderProfit } from "./orders";

const DAY = 24 * 60 * 60 * 1000;
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);
const karachiDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(date);
// "October 2026" from 2026-10.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`;
const ratio = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

// A table on a report: what the page shows and what its CSV holds.
export type Column = { key: string; label: string; kind: "text" | "count" | "pkr" | "percent" | "days" };
export type ReportTable = { key: string; title: string; note?: string; columns: Column[]; rows: Record<string, string | number | null>[] };

// The span a screen covers, as Unix seconds for raw SQL: the last `days` days, and the same span before.
export function span(days: number, now = new Date()) {
  const since = new Date(now.getTime() - days * DAY);
  return { from: seconds(since), to: seconds(now) + 1, previousFrom: seconds(new Date(now.getTime() - 2 * days * DAY)), since };
}

// Orders that sold: placed, not cancelled. Refused ones count as orders here, as on the dashboard,
// except where money is summed.
const SOLD = sql`status NOT IN ('cancelled', 'refused')`;

type Totals = { sales: number; orders: number; visitors: number; sessions: number; orderedSessions: number; returningOrders: number; customerOrders: number };

async function totals(db: Db, from: number, to: number): Promise<Totals> {
  const [money] = await db.all<{ sales: number; orders: number; returningOrders: number; customerOrders: number }>(sql`
    SELECT COALESCE(SUM(total), 0) AS sales, COUNT(*) AS orders,
      COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) AS customerOrders,
      COUNT(CASE WHEN EXISTS (SELECT 1 FROM orders AS earlier WHERE earlier.customer_id = orders.customer_id
        AND earlier.created_at < orders.created_at AND earlier.status != 'cancelled') THEN 1 END) AS returningOrders
    FROM orders WHERE created_at >= ${from} AND created_at < ${to} AND ${SOLD}`);
  // Conversion is visits that ended in an order, so orders from before tracking began, or from
  // shoppers whose browser keeps no cookies, don't inflate it.
  const [traffic] = await db.all<{ visitors: number; sessions: number; orderedSessions: number }>(sql`
    SELECT COUNT(DISTINCT CASE WHEN type = 'view' THEN visitor_id END) AS visitors,
      COUNT(DISTINCT CASE WHEN type = 'view' THEN session_id END) AS sessions,
      COUNT(DISTINCT CASE WHEN type = 'order' THEN session_id END) AS orderedSessions
    FROM events WHERE created_at >= ${from} AND created_at < ${to}`);
  return { ...money, ...traffic };
}

// The overview: the period's figures beside the period before, the two trends, and where sales
// and visits come from.
export async function overview(db: Db, days: number, now = new Date()) {
  const { from, to, previousFrom } = span(days, now);
  const day = (column: string) => sql.raw(`date(${column}, 'unixepoch', '+5 hours')`);
  const [current, previous, salesRows, visitorRows, products, cityVisits, cityOrders, sourceSessions, sourceOrders, devices, campaigns] = await Promise.all([
    totals(db, from, to),
    totals(db, previousFrom, from),
    db.all<{ date: string; sales: number; orders: number }>(sql`
      SELECT ${day("created_at")} AS date, SUM(total) AS sales, COUNT(*) AS orders FROM orders
      WHERE created_at >= ${from} AND created_at < ${to} AND ${SOLD} GROUP BY date`),
    db.all<{ date: string; visitors: number; sessions: number }>(sql`
      SELECT ${day("created_at")} AS date, COUNT(DISTINCT visitor_id) AS visitors, COUNT(DISTINCT session_id) AS sessions FROM events
      WHERE type = 'view' AND created_at >= ${from} AND created_at < ${to} GROUP BY date`),
    db.all<{ title: string; units: number; sales: number }>(sql`
      SELECT order_lines.title AS title, SUM(order_lines.quantity) AS units, SUM(order_lines.quantity * order_lines.unit_price) AS sales
      FROM order_lines JOIN orders ON orders.id = order_lines.order_id
      WHERE orders.created_at >= ${from} AND orders.created_at < ${to} AND orders.status NOT IN ('cancelled', 'refused')
      GROUP BY order_lines.title ORDER BY sales DESC, units DESC LIMIT 10`),
    db.all<{ city: string; visitors: number }>(sql`
      SELECT city, COUNT(DISTINCT visitor_id) AS visitors FROM events
      WHERE type = 'view' AND city IS NOT NULL AND created_at >= ${from} AND created_at < ${to} GROUP BY lower(city)`),
    db.all<{ city: string; orders: number; sales: number }>(sql`
      SELECT city, COUNT(*) AS orders, SUM(total) AS sales FROM orders
      WHERE city IS NOT NULL AND created_at >= ${from} AND created_at < ${to} AND ${SOLD} GROUP BY lower(trim(city))`),
    db.all<{ source: Source | null; sessions: number }>(sql`
      SELECT source, COUNT(*) AS sessions FROM events WHERE entry = 1 AND created_at >= ${from} AND created_at < ${to} GROUP BY source`),
    db.all<{ source: Source | null; orders: number; sales: number }>(sql`
      SELECT landing.source AS source, COUNT(DISTINCT orders.number) AS orders, SUM(orders.total) AS sales
      FROM events AS placed
      JOIN events AS landing ON landing.session_id = placed.session_id AND landing.entry = 1
      JOIN orders ON orders.number = placed.order_number
      WHERE placed.type = 'order' AND placed.created_at >= ${from} AND placed.created_at < ${to} AND orders.status != 'cancelled'
      GROUP BY landing.source`),
    db.all<{ device: string | null; sessions: number }>(sql`
      SELECT device, COUNT(*) AS sessions FROM events WHERE entry = 1 AND created_at >= ${from} AND created_at < ${to} GROUP BY device`),
    db.all<{ campaign: string; sessions: number; orders: number }>(sql`
      SELECT landing.campaign AS campaign, COUNT(DISTINCT landing.session_id) AS sessions,
        COUNT(DISTINCT placed.order_number) AS orders
      FROM events AS landing LEFT JOIN events AS placed ON placed.session_id = landing.session_id AND placed.type = 'order'
      WHERE landing.entry = 1 AND landing.campaign IS NOT NULL AND landing.created_at >= ${from} AND landing.created_at < ${to}
      GROUP BY landing.campaign ORDER BY sessions DESC, MAX(landing.created_at) DESC LIMIT 10`),
  ]);

  const dates = Array.from({ length: days }, (_, index) => karachiDate(new Date(now.getTime() - (days - 1 - index) * DAY)));
  const average = (row: Totals) => (row.orders ? Math.round(row.sales / row.orders) : 0);
  const measure = (row: Totals) => ({
    sales: row.sales,
    orders: row.orders,
    averageOrder: average(row),
    visitors: row.visitors,
    sessions: row.sessions,
    conversion: ratio(row.orderedSessions, row.sessions),
    returningRate: ratio(row.returningOrders, row.customerOrders),
  });

  const cities = new Map<string, { city: string; visitors: number; orders: number; sales: number }>();
  for (const row of cityVisits) cities.set(row.city.trim().toLowerCase(), { city: row.city, visitors: row.visitors, orders: 0, sales: 0 });
  for (const row of cityOrders) {
    const key = row.city.trim().toLowerCase();
    const known = cities.get(key) ?? { city: row.city.trim(), visitors: 0, orders: 0, sales: 0 };
    cities.set(key, { ...known, orders: row.orders, sales: row.sales });
  }

  const sessionsTotal = sourceSessions.reduce((sum, row) => sum + row.sessions, 0);
  const deviceTotal = devices.reduce((sum, row) => sum + row.sessions, 0);
  return {
    current: measure(current),
    previous: measure(previous),
    sales: dates.map((date) => {
      const row = salesRows.find((candidate) => candidate.date === date);
      return { date, sales: row?.sales ?? 0, orders: row?.orders ?? 0 };
    }),
    visitors: dates.map((date) => {
      const row = visitorRows.find((candidate) => candidate.date === date);
      return { date, visitors: row?.visitors ?? 0, sessions: row?.sessions ?? 0 };
    }),
    products,
    cities: [...cities.values()].sort((a, b) => b.sales - a.sales || b.visitors - a.visitors).slice(0, 12),
    sources: sourceSessions
      .map((row) => {
        const placed = sourceOrders.find((candidate) => candidate.source === row.source);
        const source = (row.source ?? "direct") as Source;
        return {
          source,
          label: SOURCE_LABELS[source] ?? row.source ?? "Direct",
          sessions: row.sessions,
          share: ratio(row.sessions, sessionsTotal),
          orders: placed?.orders ?? 0,
          sales: placed?.sales ?? 0,
          conversion: ratio(placed?.orders ?? 0, row.sessions),
        };
      })
      .sort((a, b) => b.sessions - a.sessions),
    devices: (["phone", "tablet", "desktop"] as const).map((device) => {
      const sessions = devices.find((row) => row.device === device)?.sessions ?? 0;
      return { device, sessions, share: ratio(sessions, deviceTotal) };
    }),
    campaigns,
  };
}

export type Overview = Awaited<ReturnType<typeof overview>>;

// Right now: who is on the store and on which page, carts and checkouts in play, and today's orders.
export async function liveView(db: Db, now = new Date()) {
  const fiveMinutes = seconds(now) - 5 * 60;
  const halfHour = seconds(now) - 30 * 60;
  const midnight = seconds(new Date(`${karachiDate(now)}T00:00:00+05:00`));
  const [pages, carts, checkouts, today] = await Promise.all([
    db.all<{ sessionId: string; visitorId: string; path: string; city: string | null; device: string | null; at: number; source: Source | null }>(sql`
      SELECT latest.session_id AS sessionId, latest.visitor_id AS visitorId, latest.path AS path, latest.city AS city,
        latest.device AS device, latest.created_at AS at,
        (SELECT landing.source FROM events AS landing WHERE landing.session_id = latest.session_id AND landing.entry = 1 LIMIT 1) AS source
      FROM events AS latest
      WHERE latest.type = 'view' AND latest.created_at >= ${fiveMinutes}
        AND latest.id = (SELECT MAX(later.id) FROM events AS later WHERE later.session_id = latest.session_id AND later.type = 'view')
      ORDER BY latest.created_at DESC LIMIT 50`),
    db.all<{ carts: number }>(sql`
      SELECT COUNT(DISTINCT carted.session_id) AS carts FROM events AS carted
      WHERE carted.type = 'cart' AND carted.created_at >= ${halfHour}
        AND NOT EXISTS (SELECT 1 FROM events AS placed WHERE placed.session_id = carted.session_id AND placed.type = 'order' AND placed.created_at >= carted.created_at)`),
    db.all<{ checkouts: number }>(sql`
      SELECT COUNT(*) AS checkouts FROM checkouts WHERE order_id IS NULL AND updated_at >= ${halfHour}`),
    db.all<{ number: number; name: string; city: string | null; total: number; status: string; at: number }>(sql`
      SELECT number, name, city, total, status, created_at AS at FROM orders
      WHERE created_at >= ${midnight} AND status != 'cancelled' ORDER BY created_at DESC`),
  ]);
  const cityCounts = new Map<string, number>();
  for (const page of pages) if (page.city) cityCounts.set(page.city, (cityCounts.get(page.city) ?? 0) + 1);
  return {
    visitors: new Set(pages.map((page) => page.visitorId)).size,
    pages: pages.map((page) => ({ ...page, at: new Date(page.at * 1000), sourceLabel: page.source ? (SOURCE_LABELS[page.source] ?? page.source) : "Direct" })),
    carts: carts[0]?.carts ?? 0,
    checkouts: checkouts[0]?.checkouts ?? 0,
    orders: today.map((order) => ({ ...order, at: new Date(order.at * 1000) })),
    sales: today.reduce((sum, order) => sum + (order.status === "refused" ? 0 : order.total), 0),
    cities: [...cityCounts.entries()].map(([city, visitors]) => ({ city, visitors })).sort((a, b) => b.visitors - a.visitors),
  };
}

export const FUNNEL_STEPS = [
  { key: "visited", label: "Visited the store" },
  { key: "product", label: "Viewed a product" },
  { key: "cart", label: "Added to cart" },
  { key: "checkout", label: "Started checkout" },
  { key: "ordered", label: "Placed an order" },
  { key: "confirmed", label: "Confirmed" },
  { key: "delivered", label: "Delivered" },
] as const;

// From a visit to a delivered order, counted in sessions, then in the orders those sessions placed.
// For cash on delivery the last two matter most: an order isn't a sale until it's confirmed and delivered.
export async function funnel(db: Db, days: number, now = new Date()) {
  const { from, to } = span(days, now);
  const [[steps], [outcomes]] = await Promise.all([
    db.all<{ visited: number; product: number; cart: number; checkout: number; ordered: number }>(sql`
      SELECT COUNT(DISTINCT session_id) AS visited,
        COUNT(DISTINCT CASE WHEN type = 'view' AND path LIKE '/products/%' THEN session_id END) AS product,
        COUNT(DISTINCT CASE WHEN type = 'cart' THEN session_id END) AS cart,
        COUNT(DISTINCT CASE WHEN type = 'view' AND path = '/checkout' THEN session_id END) AS checkout,
        COUNT(DISTINCT CASE WHEN type = 'order' THEN session_id END) AS ordered
      FROM events WHERE created_at >= ${from} AND created_at < ${to}`),
    db.all<{ confirmed: number; delivered: number }>(sql`
      SELECT COUNT(DISTINCT CASE WHEN orders.confirmed_at IS NOT NULL AND orders.status != 'cancelled' THEN placed.session_id END) AS confirmed,
        COUNT(DISTINCT CASE WHEN orders.status = 'delivered' THEN placed.session_id END) AS delivered
      FROM events AS placed JOIN orders ON orders.number = placed.order_number
      WHERE placed.type = 'order' AND placed.created_at >= ${from} AND placed.created_at < ${to}`),
  ]);
  const counts: Record<string, number> = { ...steps, ...outcomes };
  return FUNNEL_STEPS.map((step, index) => {
    const count = counts[step.key] ?? 0;
    const before = index === 0 ? count : (counts[FUNNEL_STEPS[index - 1].key] ?? 0);
    return { ...step, count, ofPrevious: index === 0 ? 100 : ratio(count, before), ofVisits: ratio(count, counts.visited ?? 0) };
  });
}

const money = (key: string, label: string): Column => ({ key, label, kind: "pkr" });
const count = (key: string, label: string): Column => ({ key, label, kind: "count" });
const text = (key: string, label: string): Column => ({ key, label, kind: "text" });
const percent = (key: string, label: string): Column => ({ key, label, kind: "percent" });

// Sales by product, collection, city, payment method and discount code.
async function salesReports(db: Db, from: number, to: number): Promise<ReportTable[]> {
  const where = sql`orders.created_at >= ${from} AND orders.created_at < ${to} AND orders.status NOT IN ('cancelled', 'refused')`;
  const [byProduct, byCollection, byCity, byPayment, byCode] = await Promise.all([
    db.all(sql`
      SELECT order_lines.title AS product, SUM(order_lines.quantity) AS units, COUNT(DISTINCT orders.id) AS orders,
        SUM(order_lines.quantity * order_lines.unit_price) AS sales
      FROM order_lines JOIN orders ON orders.id = order_lines.order_id WHERE ${where}
      GROUP BY order_lines.title ORDER BY sales DESC`),
    db.all(sql`
      SELECT COALESCE(collections.title, 'Not in the catalog any more') AS collection, SUM(order_lines.quantity) AS units,
        SUM(order_lines.quantity * order_lines.unit_price) AS sales
      FROM order_lines JOIN orders ON orders.id = order_lines.order_id
      LEFT JOIN variants ON variants.id = order_lines.variant_id
      LEFT JOIN products ON products.id = variants.product_id
      LEFT JOIN collections ON collections.handle = products.collection_handle
      WHERE ${where} GROUP BY collection ORDER BY sales DESC`),
    db.all(sql`
      SELECT COALESCE(NULLIF(trim(orders.city), ''), 'Not given') AS city, COUNT(*) AS orders, SUM(orders.total) AS sales
      FROM orders WHERE ${where} GROUP BY lower(trim(orders.city)) ORDER BY sales DESC`),
    db.all<{ method: string; orders: number; sales: number }>(sql`
      SELECT orders.payment_method AS method, COUNT(*) AS orders, SUM(orders.total) AS sales,
        CAST(ROUND(AVG(orders.total)) AS INTEGER) AS average
      FROM orders WHERE ${where} GROUP BY orders.payment_method ORDER BY sales DESC`),
    db.all(sql`
      SELECT orders.discount_code AS code, COUNT(*) AS orders, SUM(orders.discount_total) AS given, SUM(orders.total) AS sales
      FROM orders WHERE ${where} AND orders.discount_code IS NOT NULL GROUP BY orders.discount_code ORDER BY orders DESC`),
  ]);
  return [
    { key: "by-product", title: "By product", columns: [text("product", "Product"), count("units", "Units"), count("orders", "Orders"), money("sales", "Sales")], rows: byProduct as ReportTable["rows"] },
    { key: "by-collection", title: "By collection", columns: [text("collection", "Collection"), count("units", "Units"), money("sales", "Sales")], rows: byCollection as ReportTable["rows"] },
    { key: "by-city", title: "By city", columns: [text("city", "City"), count("orders", "Orders"), money("sales", "Sales")], rows: byCity as ReportTable["rows"] },
    {
      key: "by-payment",
      title: "By payment method",
      columns: [text("method", "Payment"), count("orders", "Orders"), money("sales", "Sales"), money("average", "Average order")],
      rows: byPayment.map((row) => ({ ...row, method: PAYMENT_LABELS[row.method] ?? row.method })),
    },
    {
      key: "by-discount",
      title: "By discount code",
      columns: [text("code", "Code"), count("orders", "Orders"), money("given", "Given off"), money("sales", "Sales")],
      rows: byCode as ReportTable["rows"],
    },
  ];
}

// New against returning, how often people come back, and monthly cohorts.
async function customerReports(db: Db, from: number, to: number, now: Date): Promise<ReportTable[]> {
  const lapsedBefore = seconds(now) - 90 * 24 * 60 * 60;
  const [[mix], [repeat], [gap], [lapsed], cohorts] = await Promise.all([
    db.all<{ newOrders: number; newSales: number; returningOrders: number; returningSales: number }>(sql`
      SELECT COUNT(CASE WHEN earlier IS NULL THEN 1 END) AS newOrders, COALESCE(SUM(CASE WHEN earlier IS NULL THEN total END), 0) AS newSales,
        COUNT(CASE WHEN earlier IS NOT NULL THEN 1 END) AS returningOrders, COALESCE(SUM(CASE WHEN earlier IS NOT NULL THEN total END), 0) AS returningSales
      FROM (SELECT orders.total AS total,
        (SELECT 1 FROM orders AS prior WHERE prior.customer_id = orders.customer_id AND prior.created_at < orders.created_at AND prior.status != 'cancelled' LIMIT 1) AS earlier
        FROM orders WHERE orders.created_at >= ${from} AND orders.created_at < ${to} AND orders.status NOT IN ('cancelled', 'refused'))`),
    db.all<{ buyers: number; repeaters: number }>(sql`
      SELECT COUNT(*) AS buyers, COUNT(CASE WHEN placed >= 2 THEN 1 END) AS repeaters
      FROM (SELECT customer_id, COUNT(*) AS placed FROM orders WHERE customer_id IS NOT NULL AND status != 'cancelled' GROUP BY customer_id)`),
    db.all<{ days: number | null }>(sql`
      SELECT AVG((last_at - first_at) / 86400.0 / (placed - 1)) AS days
      FROM (SELECT MIN(created_at) AS first_at, MAX(created_at) AS last_at, COUNT(*) AS placed FROM orders
        WHERE customer_id IS NOT NULL AND status != 'cancelled' GROUP BY customer_id HAVING placed >= 2)`),
    db.all<{ lapsed: number }>(sql`
      SELECT COUNT(*) AS lapsed FROM (SELECT MAX(created_at) AS last_at FROM orders
        WHERE customer_id IS NOT NULL AND status != 'cancelled' GROUP BY customer_id HAVING last_at < ${lapsedBefore})`),
    db.all(sql`
      SELECT month, COUNT(*) AS customers, COUNT(CASE WHEN placed >= 2 THEN 1 END) AS returned,
        ROUND(100.0 * COUNT(CASE WHEN placed >= 2 THEN 1 END) / COUNT(*), 1) AS rate
      FROM (SELECT strftime('%Y-%m', MIN(created_at), 'unixepoch', '+5 hours') AS month, COUNT(*) AS placed FROM orders
        WHERE customer_id IS NOT NULL AND status != 'cancelled' GROUP BY customer_id)
      GROUP BY month ORDER BY month DESC LIMIT 12`),
  ]);
  return [
    {
      key: "new-returning",
      title: "New and returning, this period",
      columns: [text("who", "Customers"), count("orders", "Orders"), money("sales", "Sales")],
      rows: [
        { who: "First order", orders: mix.newOrders, sales: mix.newSales },
        { who: "Ordered before", orders: mix.returningOrders, sales: mix.returningSales },
      ],
    },
    {
      key: "loyalty",
      title: "Coming back, all time",
      columns: [text("measure", "Measure"), text("value", "Value")],
      rows: [
        { measure: "Customers who ordered again", value: `${ratio(repeat.repeaters, repeat.buyers)}% (${repeat.repeaters} of ${repeat.buyers})` },
        { measure: "Days between orders, on average", value: gap.days === null ? "Not yet" : `${Math.round(gap.days)} days` },
        { measure: "No order in 90 days", value: `${lapsed.lapsed} customers` },
      ],
    },
    {
      key: "cohorts",
      title: "By month of first order",
      note: "Of the customers whose first order fell in each month, how many have ordered again since.",
      columns: [text("month", "First ordered"), count("customers", "Customers"), count("returned", "Ordered again"), percent("rate", "Came back")],
      rows: (cohorts as ReportTable["rows"]).map((row) => ({ ...row, month: monthLabel(String(row.month)) })),
    },
  ];
}

// Where visits land and leave, and products looked at more than they're bought.
async function behaviourReports(db: Db, from: number, to: number): Promise<ReportTable[]> {
  const [landing, exits, products] = await Promise.all([
    db.all(sql`
      SELECT landing.path AS page, COUNT(DISTINCT landing.session_id) AS sessions, COUNT(DISTINCT placed.order_number) AS orders,
        ROUND(100.0 * COUNT(DISTINCT placed.order_number) / COUNT(DISTINCT landing.session_id), 1) AS conversion
      FROM events AS landing LEFT JOIN events AS placed ON placed.session_id = landing.session_id AND placed.type = 'order'
      WHERE landing.entry = 1 AND landing.created_at >= ${from} AND landing.created_at < ${to}
      GROUP BY landing.path ORDER BY sessions DESC LIMIT 20`),
    db.all(sql`
      SELECT final.path AS page, COUNT(*) AS exits FROM events AS final
      WHERE final.type = 'view' AND final.created_at >= ${from} AND final.created_at < ${to}
        AND final.id = (SELECT MAX(later.id) FROM events AS later WHERE later.session_id = final.session_id AND later.type = 'view')
      GROUP BY final.path ORDER BY exits DESC LIMIT 20`),
    db.all<{ product: string; views: number; units: number; perSale: number | null }>(sql`
      SELECT products.title AS product, viewed.views AS views, COALESCE(sold.units, 0) AS units,
        CASE WHEN COALESCE(sold.units, 0) = 0 THEN NULL ELSE ROUND(1.0 * viewed.views / sold.units, 1) END AS perSale
      FROM (SELECT product_handle AS handle, COUNT(*) AS views FROM events
        WHERE type = 'view' AND product_handle IS NOT NULL AND created_at >= ${from} AND created_at < ${to} GROUP BY product_handle) AS viewed
      JOIN products ON products.handle = viewed.handle
      LEFT JOIN (SELECT variants.product_id AS product_id, SUM(order_lines.quantity) AS units FROM order_lines
        JOIN orders ON orders.id = order_lines.order_id JOIN variants ON variants.id = order_lines.variant_id
        WHERE orders.created_at >= ${from} AND orders.created_at < ${to} AND orders.status NOT IN ('cancelled', 'refused')
        GROUP BY variants.product_id) AS sold ON sold.product_id = products.id
      ORDER BY viewed.views DESC LIMIT 20`),
  ]);
  return [
    {
      key: "landing-pages",
      title: "Landing pages",
      note: "The first page of each visit, and how many of those visits ended in an order.",
      columns: [text("page", "Page"), count("sessions", "Visits"), count("orders", "Orders"), percent("conversion", "Conversion")],
      rows: landing as ReportTable["rows"],
    },
    { key: "exit-pages", title: "Exit pages", note: "The last page people saw before leaving.", columns: [text("page", "Page"), count("exits", "Exits")], rows: exits as ReportTable["rows"] },
    {
      key: "viewed-not-bought",
      title: "Viewed against bought",
      note: "Products looked at often but rarely bought show a high number of views for each sale.",
      columns: [text("product", "Product"), count("views", "Views"), count("units", "Sold"), text("perSale", "Views per sale")],
      rows: products.map((row) => ({ ...row, perSale: row.perSale === null ? "No sales" : row.perSale })),
    },
  ];
}

// Cancellations, refusals by city, days to deliver, and cash still with the courier.
async function operationsReports(db: Db, from: number, to: number): Promise<ReportTable[]> {
  const [[rates], refusals, [cash]] = await Promise.all([
    db.all<{ placed: number; cancelled: number; shipped: number; refused: number; days: number | null }>(sql`
      SELECT COUNT(*) AS placed, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
        COUNT(CASE WHEN shipped_at IS NOT NULL THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'refused' THEN 1 END) AS refused,
        AVG(CASE WHEN delivered_at IS NOT NULL AND shipped_at IS NOT NULL THEN (delivered_at - shipped_at) / 86400.0 END) AS days
      FROM orders WHERE created_at >= ${from} AND created_at < ${to}`),
    db.all(sql`
      SELECT COALESCE(NULLIF(trim(city), ''), 'Not given') AS city, COUNT(CASE WHEN shipped_at IS NOT NULL THEN 1 END) AS shipped,
        COUNT(CASE WHEN status = 'refused' THEN 1 END) AS refused,
        ROUND(100.0 * COUNT(CASE WHEN status = 'refused' THEN 1 END) / MAX(COUNT(CASE WHEN shipped_at IS NOT NULL THEN 1 END), 1), 1) AS rate
      FROM orders WHERE created_at >= ${from} AND created_at < ${to} GROUP BY lower(trim(city))
      HAVING shipped > 0 ORDER BY refused DESC, shipped DESC`),
    db.all<{ amount: number; orders: number }>(sql`
      SELECT COALESCE(SUM(total - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.order_id = orders.id) - cod_tax), 0) AS amount,
        COUNT(*) AS orders
      FROM orders WHERE payment_method = 'cod' AND status = 'delivered' AND paid_out_at IS NULL
        AND total > (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.order_id = orders.id) + cod_tax`),
  ]);
  return [
    {
      key: "operations",
      title: "This period",
      columns: [text("measure", "Measure"), text("value", "Value")],
      rows: [
        { measure: "Cancelled", value: `${ratio(rates.cancelled, rates.placed)}% (${rates.cancelled} of ${rates.placed} orders)` },
        { measure: "Refused at the door", value: `${ratio(rates.refused, rates.shipped)}% (${rates.refused} of ${rates.shipped} shipped)` },
        { measure: "Days from shipping to delivery, on average", value: rates.days === null ? "Not yet" : `${Math.round(rates.days * 10) / 10} days` },
        { measure: "COD cash still with the courier, now", value: `PKR ${cash.amount.toLocaleString("en-PK")} on ${cash.orders} orders` },
      ],
    },
    {
      key: "refusals-by-city",
      title: "Refusals by city",
      columns: [text("city", "City"), count("shipped", "Shipped"), count("refused", "Refused"), percent("rate", "Refusal rate")],
      rows: refusals as ReportTable["rows"],
    },
  ];
}

// Profit by the month orders were delivered (or came back refused): revenue, less what the jackets
// cost, the courier's charges and the COD tax, as on each order's Profit card.
async function profitReports(db: Db, codTaxPercent: number): Promise<ReportTable[]> {
  const settled = await db.query.orders.findMany({
    where: (orders, { inArray }) => inArray(orders.status, ["delivered", "refused"]),
    with: { lines: { columns: { costPrice: true, quantity: true } }, payments: { columns: { amount: true } } },
  });
  const months = new Map<string, { month: string; orders: number; revenue: number; cost: number; courier: number; tax: number; profit: number; missing: number }>();
  for (const order of settled) {
    const at = order.deliveredAt ?? order.refusedAt ?? order.createdAt;
    const month = karachiDate(at).slice(0, 7);
    const result = orderProfit({ ...order, paid: order.payments.reduce((sum, payment) => sum + payment.amount, 0) }, codTaxPercent);
    const row = months.get(month) ?? { month, orders: 0, revenue: 0, cost: 0, courier: 0, tax: 0, profit: 0, missing: 0 };
    row.orders += 1;
    row.revenue += result.revenue;
    row.cost += result.cost;
    row.courier += result.courier;
    row.tax += result.tax;
    row.profit += result.profit;
    if (result.costMissing) row.missing += 1;
    months.set(month, row);
  }
  return [
    {
      key: "profit-by-month",
      title: "By month",
      note: "By the month each order was delivered or came back. A jacket with no cost set counts as costing nothing: the last column says how many orders that touches.",
      columns: [
        text("month", "Month"),
        count("orders", "Orders"),
        money("revenue", "Revenue"),
        money("cost", "Jacket cost"),
        money("courier", "Courier"),
        money("tax", "COD tax"),
        money("profit", "Profit"),
        count("missing", "Cost not set"),
      ],
      rows: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)).map((row) => ({ ...row, month: monthLabel(row.month) })),
    },
  ];
}

export const REPORT_TABS = [
  { key: "sales", label: "Sales" },
  { key: "customers", label: "Customers" },
  { key: "behaviour", label: "Behaviour" },
  { key: "operations", label: "Operations" },
  { key: "profit", label: "Profit" },
] as const;
export type ReportTab = (typeof REPORT_TABS)[number]["key"];

export async function reports(db: Db, tab: ReportTab, days: number, { now = new Date(), codTaxPercent = 4 } = {}): Promise<ReportTable[]> {
  const { from, to } = span(days, now);
  if (tab === "sales") return salesReports(db, from, to);
  if (tab === "customers") return customerReports(db, from, to, now);
  if (tab === "behaviour") return behaviourReports(db, from, to);
  if (tab === "operations") return operationsReports(db, from, to);
  return profitReports(db, codTaxPercent);
}

// A report table as CSV, for a spreadsheet. Cells that could read as formulas get a '.
export function tableCsv(table: ReportTable) {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  const lines = [table.columns.map((column) => cell(column.label)).join(","), ...table.rows.map((row) => table.columns.map((column) => cell(row[column.key])).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
