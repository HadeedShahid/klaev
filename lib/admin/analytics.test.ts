// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "../db/test-db";
import { customers, events, orderLines, orders } from "../db/schema";
import { funnel, liveView, overview, REPORT_TABS, reports, splitRupees, tableCsv } from "./analytics";

const NOW = new Date("2026-10-27T12:00:00+05:00");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);
afterAll(() => store?.dispose());

type EventRow = typeof events.$inferInsert;
const view = (session: string, visitor: string, path: string, minutesAgo: number, extra: Partial<EventRow> = {}): EventRow => ({
  type: "view",
  sessionId: session.padEnd(12, "0"),
  visitorId: visitor.padEnd(12, "0"),
  path,
  productHandle: path.match(/^\/products\/(.+)$/)?.[1] ?? null,
  device: "phone",
  city: "Lahore",
  createdAt: ago(minutesAgo),
  ...extra,
});

// Three visits today: one from Instagram that orders and gets delivered, one from Google that adds to
// cart and leaves at checkout, and one direct that only looks around.
async function seed() {
  const [buyer] = await store.db.insert(customers).values({ name: "Ayesha", email: "a@example.com", phone: "+923001234567" }).returning({ id: customers.id });
  await store.db.insert(orders).values([
    // An earlier order makes today's a returning customer's.
    { number: 1500, customerId: buyer.id, status: "delivered", paymentMethod: "cod", name: "Ayesha", city: "Lahore", subtotal: 17999, total: 18899, createdAt: ago(60 * 24 * 40), deliveredAt: ago(60 * 24 * 38) },
    {
      number: 1501,
      customerId: buyer.id,
      status: "delivered",
      paymentMethod: "cod",
      name: "Ayesha",
      city: "lahore",
      subtotal: 17999,
      total: 18899,
      source: "web",
      createdAt: ago(50),
      confirmedAt: ago(40),
      shippedAt: ago(30),
      deliveredAt: ago(10),
    },
  ]);
  await store.db.insert(events).values([
    view("ig", "anna", "/products/dark-brown-cropped-sheepskin-leather-jacket", 60, { entry: true, source: "instagram", campaign: "eid" }),
    { ...view("ig", "anna", "", 58), type: "cart", productHandle: "dark-brown-cropped-sheepskin-leather-jacket" },
    view("ig", "anna", "/checkout", 56),
    { ...view("ig", "anna", "/checkout", 50), type: "order", orderNumber: 1501 },
    view("google", "bilal", "/", 30, { entry: true, source: "google", device: "desktop", city: "Karachi" }),
    view("google", "bilal", "/products/black-suede-jacket", 29, { city: "Karachi", device: "desktop" }),
    { ...view("google", "bilal", "", 28, { city: "Karachi" }), type: "cart", productHandle: "black-suede-jacket" },
    view("google", "bilal", "/checkout", 3, { city: "Karachi", device: "desktop" }),
    view("direct", "chen", "/collections/all", 2, { entry: true, source: "direct" }),
  ]);
}

describe("analytics", () => {
  test("the overview: sales, visits, conversion, returning customers, sources and devices", async () => {
    await seed();
    const result = await overview(store.db, 7, NOW);
    expect(result.current).toMatchObject({ sales: 18899, orders: 1, visitors: 3, sessions: 3, conversion: 33.3, returningRate: 100 });
    expect(result.visitors.at(-1)).toMatchObject({ date: "2026-10-27", visitors: 3 });
    // The seeded orders have no lines, so no product has sales yet.
    expect(result.products).toEqual([]);
    const instagram = result.sources.find((row) => row.source === "instagram");
    expect(instagram).toMatchObject({ label: "Instagram", sessions: 1, orders: 1, sales: 18899, conversion: 100 });
    expect(result.devices).toEqual([
      { device: "phone", sessions: 2, share: 66.7 },
      { device: "tablet", sessions: 0, share: 0 },
      { device: "desktop", sessions: 1, share: 33.3 },
    ]);
    // "Lahore" from Cloudflare and "lahore" as typed are one city.
    expect(result.cities.find((row) => row.city.toLowerCase() === "lahore")).toMatchObject({ visitors: 2, orders: 1, sales: 18899 });
    expect(result.campaigns).toEqual([{ campaign: "eid", sessions: 1, orders: 1 }]);
  });

  test("campaigns list the ten with most visits, the newest first among equals", async () => {
    // Twelve one-visit campaigns, an hour apart; "launch" has two visits and leads despite its age.
    const visits = [
      ...Array.from({ length: 12 }, (_, index) => {
        const letter = String.fromCharCode(97 + index);
        return view(`s${letter}`, `v${letter}`, "/", 60 * (index + 1), { entry: true, source: "instagram", campaign: `post-${index}` });
      }),
      view("launch1", "launch1", "/", 60 * 20, { entry: true, source: "instagram", campaign: "launch" }),
      view("launch2", "launch2", "/", 60 * 21, { entry: true, source: "instagram", campaign: "launch" }),
    ];
    // D1 takes at most 100 values a query.
    for (let start = 0; start < visits.length; start += 7) await store.db.insert(events).values(visits.slice(start, start + 7));
    const { campaigns } = await overview(store.db, 7, NOW);
    expect(campaigns.map((row) => row.campaign)).toEqual(["launch", ...Array.from({ length: 9 }, (_, index) => `post-${index}`)]);
  });

  test("the funnel counts sessions at each step, then their orders confirmed and delivered", async () => {
    await seed();
    const steps = await funnel(store.db, 7, NOW);
    expect(steps.map((step) => [step.key, step.count])).toEqual([
      ["visited", 3],
      ["product", 2],
      ["cart", 2],
      ["checkout", 2],
      ["ordered", 1],
      ["confirmed", 1],
      ["delivered", 1],
    ]);
    expect(steps[4]).toMatchObject({ ofPrevious: 50, ofVisits: 33.3 });
  });

  test("the live view: who is here in the last five minutes, carts and today's orders", async () => {
    await seed();
    const live = await liveView(store.db, NOW);
    expect(live.visitors).toBe(2);
    expect(live.pages.map((page) => [page.path, page.sourceLabel])).toEqual([
      ["/collections/all", "Direct"],
      ["/checkout", "Google"],
    ]);
    // Instagram's cart became an order; Google's is still open.
    expect(live.carts).toBe(1);
    expect(live.orders.map((order) => order.number)).toEqual([1501]);
    expect(live.sales).toBe(18899);
  });

  test("every report runs, and exports as CSV", async () => {
    await seed();
    for (const tab of REPORT_TABS) {
      const tables = await reports(store.db, tab.key, 30, { now: NOW });
      expect(tables.length, tab.key).toBeGreaterThan(0);
      for (const table of tables) expect(tableCsv(table).split("\r\n")[0], table.key).toContain(table.columns[0].label);
    }
    const [byProduct] = await reports(store.db, "sales", 30, { now: NOW });
    expect(byProduct.rows).toEqual([]);
    const [mix] = await reports(store.db, "customers", 30, { now: NOW });
    expect(mix.rows).toEqual([
      { who: "First order", orders: 0, sales: 0 },
      { who: "Ordered before", orders: 1, sales: 18899 },
    ]);
    const behaviour = await reports(store.db, "behaviour", 30, { now: NOW });
    expect(behaviour.find((table) => table.key === "landing-pages")?.rows[0]).toMatchObject({ sessions: 1 });
    expect(behaviour.find((table) => table.key === "exit-pages")?.rows.map((row) => row.page)).toEqual(expect.arrayContaining(["/checkout", "/collections/all"]));
    const [profit] = await reports(store.db, "profit", 30, { now: NOW });
    expect(profit.rows.map((row) => row.month)).toEqual(["October 2026", "September 2026"]);
    // A phone keeps a report's first and last columns (components/admin/report-table.tsx), so each
    // profit table ends with the profit.
    for (const table of await reports(store.db, "profit", 30, { now: NOW })) expect(table.columns.at(-1)?.key, table.key).toBe("profit");
  });

  // A size exchange is the same customer's order going out again in another size, not a new sale.
  test("an exchange is left out of every count of orders and sales, and what it cost counts in profit", async () => {
    const [buyer] = await store.db.insert(customers).values({ name: "Mehran", email: "m@example.com", phone: "+923001234568" }).returning({ id: customers.id });
    const placed = { customerId: buyer.id, status: "delivered" as const, paymentMethod: "bank_transfer" as const, name: "Mehran", city: "Multan" };
    const [sold, exchange] = await store.db
      .insert(orders)
      .values([
        { ...placed, number: 1600, subtotal: 17999, total: 17999, courierFee: 0, createdAt: ago(60 * 24 * 3), shippedAt: ago(60 * 24 * 3), deliveredAt: ago(60 * 24 * 2) },
        { ...placed, number: 1601, source: "exchange", subtotal: 0, total: 0, courierFee: 310, createdAt: ago(60), shippedAt: ago(50), deliveredAt: ago(10) },
      ])
      .returning({ id: orders.id });
    await store.db.insert(orderLines).values([
      { orderId: sold.id, title: "Black Cropped Sheepskin Leather Jacket", size: "M", quantity: 1, unitPrice: 17999, costPrice: 9000 },
      { orderId: exchange.id, title: "Black Cropped Sheepskin Leather Jacket", size: "L", quantity: 1, unitPrice: 0, costPrice: 0 },
    ]);

    const result = await overview(store.db, 7, NOW);
    expect(result.current).toMatchObject({ sales: 17999, orders: 1, averageOrder: 17999, returningRate: 0 });
    expect(result.sales.reduce((sum, day) => sum + day.orders, 0)).toBe(1);
    expect(result.products).toEqual([{ title: "Black Cropped Sheepskin Leather Jacket", units: 1, sales: 17999 }]);
    expect(result.cities.find((row) => row.city === "Multan")).toMatchObject({ orders: 1, sales: 17999 });
    // The exchange went out today, but no one bought anything today.
    const live = await liveView(store.db, NOW);
    expect(live.orders).toEqual([]);

    const [byProduct, , , byPayment] = await reports(store.db, "sales", 30, { now: NOW });
    expect(byProduct.rows).toEqual([{ product: "Black Cropped Sheepskin Leather Jacket", units: 1, orders: 1, sales: 17999 }]);
    expect(byPayment.rows).toMatchObject([{ method: "Bank transfer", orders: 1, sales: 17999 }]);
    const [mix, loyalty] = await reports(store.db, "customers", 30, { now: NOW });
    expect(mix.rows).toEqual([
      { who: "First order", orders: 1, sales: 17999 },
      { who: "Ordered before", orders: 0, sales: 0 },
    ]);
    expect(loyalty.rows[0]).toEqual({ measure: "Customers who ordered again", value: "0% (0 of 1)" });
    const [operations] = await reports(store.db, "operations", 30, { now: NOW });
    expect(operations.rows[0]).toEqual({ measure: "Cancelled", value: "0% (0 of 1 orders)" });
    expect(operations.rows[1]).toEqual({ measure: "Refused at the door", value: "0% (0 of 1 shipped)" });
    // Profit: 17,999 less the M's 9,000, and the 310 it cost to send the L.
    const [profit] = await reports(store.db, "profit", 30, { now: NOW });
    expect(profit.rows).toEqual([{ month: "October 2026", orders: 1, revenue: 17999, cost: 9000, courier: 310, tax: 0, profit: 8689, missing: 0 }]);
  });
});

describe("profit by collection and product", () => {
  test("a parcel's rupees split by price stay whole and add up exactly", () => {
    expect(splitRupees(311, [17999, 14999])).toEqual([170, 141]);
    expect(splitRupees(31998, [17999, 14999])).toEqual([17454, 14544]);
    expect(splitRupees(310, [0, 0])).toEqual([155, 155]);
    expect(splitRupees(1, [1, 1, 1])).toEqual([1, 0, 0]);
    expect(splitRupees(0, [5, 5])).toEqual([0, 0]);
    for (const [total, weights] of [[675, [17999, 2500, 2500]], [590, [3, 7]], [18899, [1]]] as const) {
      expect(splitRupees(total, [...weights]).reduce((sum, part) => sum + part, 0)).toBe(total);
    }
  });

  // Every order on record, each one's money split over its jackets: a parcel's courier charge, COD tax
  // and discount by each jacket's share of its price, so the jackets add up to the order to the rupee.
  test("each collection, then its jackets; a jacket with no cost shows that rather than a profit", async () => {
    const [buyer] = await store.db.insert(customers).values({ name: "Sana", email: "s@example.com", phone: "+923001234569" }).returning({ id: customers.id });
    const base = { customerId: buyer.id, name: "Sana", city: "Lahore", createdAt: ago(60 * 24 * 5), deliveredAt: ago(60 * 24 * 3) };
    const placed: (typeof orders.$inferInsert)[] = [
        // COD, paid out: 18,899 less the 9,000 jacket, 590 courier and 675 tax kept.
        { ...base, number: 1700, status: "delivered", paymentMethod: "cod", subtotal: 17999, deliveryFee: 900, total: 18899, advance: 2000, courierFee: 590, codTax: 675, paidOutAt: ago(60 * 24 * 2) },
        // Two jackets in one parcel, 1,000 off, an odd courier charge: split by price, rupees kept whole.
        { ...base, number: 1701, status: "delivered", paymentMethod: "bank_transfer", subtotal: 32998, discountTotal: 1000, total: 31998, courierFee: 311 },
        // Turned away at the door: no sale, just the courier charge. Its missing cost doesn't matter.
        { ...base, number: 1702, status: "refused", paymentMethod: "cod", subtotal: 17999, total: 18899, advance: 2000, courierFee: 590, deliveredAt: null, refusedAt: ago(60 * 24 * 2) },
        // A size exchange of #1700: no sale, its courier charge on the same jacket.
        { ...base, number: 1703, status: "delivered", paymentMethod: "bank_transfer", source: "exchange", subtotal: 0, total: 0, courierFee: 310 },
        // The suede's cost isn't set.
        { ...base, number: 1704, status: "delivered", paymentMethod: "bank_transfer", subtotal: 18999, total: 18999, courierFee: 310 },
        // Neither of these has made anything yet.
        { ...base, number: 1705, status: "cancelled", paymentMethod: "cod", subtotal: 17999, total: 18899, courierFee: null, deliveredAt: null },
        { ...base, number: 1706, status: "shipped", paymentMethod: "cod", subtotal: 17999, total: 18899, courierFee: 590, deliveredAt: null },
        // A product since deleted from the catalog.
        { ...base, number: 1707, status: "delivered", paymentMethod: "bank_transfer", subtotal: 2500, total: 2500, courierFee: null },
    ];
    // One at a time: D1 takes at most 100 values in a statement.
    const ids: number[] = [];
    for (const order of placed) ids.push((await store.db.insert(orders).values(order).returning({ id: orders.id }))[0].id);
    const [cod, pair, refused, exchange, suede, cancelled, shipped, gone] = ids;
    const line = (orderId: number, variantId: number | null, title: string, unitPrice: number, costPrice: number | null) => ({ orderId, variantId, title, size: "M", quantity: 1, unitPrice, costPrice });
    await store.db.insert(orderLines).values([
      line(cod, 45831741538375, "Black Cropped Sheepskin Leather Jacket", 17999, 9000),
      line(pair, 49253873647687, "Dark Brown Cropped Sheepskin Leather Jacket", 17999, 9000),
      line(pair, 42204090892359, "Black Lambskin Leather Jacket", 14999, 7500),
      line(refused, 45831741505607, "Black Cropped Sheepskin Leather Jacket", 17999, null),
      line(exchange, 45831741571143, "Black Cropped Sheepskin Leather Jacket", 0, 0),
      line(suede, 42205323198535, "Black Goatskin Suede Jacket", 18999, null),
      line(cancelled, 45831741538375, "Black Cropped Sheepskin Leather Jacket", 17999, 9000),
      line(shipped, 45831741538375, "Black Cropped Sheepskin Leather Jacket", 17999, 9000),
      line(gone, null, "Old Belt", 2500, 1000),
    ]);

    const [byMonth, byProduct] = await reports(store.db, "profit", 30, { now: NOW });
    expect(byProduct).toMatchObject({ key: "profit-by-product", title: "By collection and product" });
    expect(byProduct.rows).toEqual([
      { name: "Men’s Cropped Leather Jackets", level: 0, sold: 2, revenue: 36353, cost: 18000, courier: 1660, tax: 675, profit: 16018 },
      { name: "Black Cropped Sheepskin Leather Jacket", level: 1, sold: 1, revenue: 18899, cost: 9000, courier: 1490, tax: 675, profit: 7734 },
      { name: "Dark Brown Cropped Sheepskin Leather Jacket", level: 1, sold: 1, revenue: 17454, cost: 9000, courier: 170, tax: 0, profit: 8284 },
      { name: "Suede Jackets", level: 0, sold: 1, revenue: 18999, cost: "Cost not set", courier: 310, tax: 0, profit: "Cost not set" },
      { name: "Black Goatskin Suede Jacket", level: 1, sold: 1, revenue: 18999, cost: "Cost not set", courier: 310, tax: 0, profit: "Cost not set" },
      { name: "Leather Jackets", level: 0, sold: 1, revenue: 14544, cost: 7500, courier: 141, tax: 0, profit: 6903 },
      { name: "Black Lambskin Leather Jacket", level: 1, sold: 1, revenue: 14544, cost: 7500, courier: 141, tax: 0, profit: 6903 },
      { name: "Not in the catalog any more", level: 0, sold: 1, revenue: 2500, cost: 1000, courier: 0, tax: 0, profit: 1500 },
      { name: "Old Belt", level: 1, sold: 1, revenue: 2500, cost: 1000, courier: 0, tax: 0, profit: 1500 },
    ]);

    // Every rupee is accounted for: the months' revenue, courier and tax are the collections', and the
    // months' profit is theirs plus the suede, which the months count as costing nothing.
    const collections = byProduct.rows.filter((row) => row.level === 0);
    const total = (rows: typeof byMonth.rows, key: string) => rows.reduce((sum, row) => sum + (typeof row[key] === "number" ? (row[key] as number) : 0), 0);
    for (const key of ["revenue", "courier", "tax"]) expect(total(collections, key), key).toBe(total(byMonth.rows, key));
    expect(total(collections, "profit") + (18999 - 310)).toBe(total(byMonth.rows, "profit"));
  });
});
