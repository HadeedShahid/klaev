// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "../db/test-db";
import { customers, events, orders } from "../db/schema";
import { funnel, liveView, overview, REPORT_TABS, reports, tableCsv } from "./analytics";

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
  });
});
