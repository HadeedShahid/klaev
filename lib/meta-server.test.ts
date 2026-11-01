// @vitest-environment node
import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "./db/test-db";
import { settings } from "./db/schema";
import { placeOrder } from "./orders";

const { after, context, requestHeaders, requestCookies, db } = vi.hoisted(() => ({
  after: vi.fn(),
  context: vi.fn(),
  requestHeaders: vi.fn(),
  requestCookies: vi.fn(),
  db: vi.fn(),
}));

vi.mock("next/server", () => ({ after }));
vi.mock("next/headers", () => ({ headers: requestHeaders, cookies: requestCookies }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
vi.mock("@/lib/db", async (original) => ({ ...(await original<typeof import("@/lib/db")>()), getDb: db }));

const { trackMeta, trackPurchase } = await import("./meta-server");
const { getMetaSettings, saveMetaSettings } = await import("./settings");

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const DARK_BROWN_S = "49253873647687";
const BURGUNDY_S = "49142312730695";
const customer = { name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567", city: "Lahore", address: "House 1, Model Town", payment: "cod" as const };
const fetcher = vi.fn();

let store: Awaited<ReturnType<typeof createTestDb>>;

async function turnOn() {
  await store.db.insert(settings).values({ key: "meta", value: { enabled: true, pixelId: "1234567890" } });
}
const flush = async () => {
  for (const [task] of after.mock.calls) await task();
};
const posted = () => JSON.parse(fetcher.mock.calls[0][1].body);

beforeEach(async () => {
  vi.clearAllMocks();
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockImplementation(async () => new Response("{}"));
  db.mockResolvedValue(store.db);
  context.mockResolvedValue({ env: { META_ACCESS_TOKEN: "SECRET" } });
  requestHeaders.mockResolvedValue(new Headers({ host: "klaev.com", "user-agent": "Mozilla/5.0", "cf-connecting-ip": "203.0.113.9" }));
  requestCookies.mockResolvedValue({ get: (name: string) => ({ _fbp: { value: "fb.1.1.2" }, _fbc: { value: "fb.1.1.click" }, klaev_vid: { value: "visitor1234567" } })[name] });
}, 60_000);

afterEach(() => vi.unstubAllGlobals());
afterAll(() => store?.dispose());

describe("the Meta settings", () => {
  test("stay off until there's a pixel ID, which is digits only", async () => {
    expect(await getMetaSettings(store.db)).toEqual({ enabled: false, pixelId: "" });
    expect(await saveMetaSettings(store.db, { enabled: true, pixelId: "" })).toEqual({ ok: false, message: "Add the pixel ID first." });
    expect(await saveMetaSettings(store.db, { enabled: true, pixelId: "abc" })).toEqual({ ok: false, message: "The pixel ID is digits only." });
    expect(await saveMetaSettings(store.db, { enabled: true, pixelId: " 1234567890 " })).toEqual({ ok: true });
    expect(await getMetaSettings(store.db)).toEqual({ enabled: true, pixelId: "1234567890" });
  });
});

describe("trackMeta", () => {
  const event = { name: "ViewContent" as const, id: "abcdef123456", url: "https://klaev.com/products/x", custom: { value: 17999, currency: "PKR" as const } };

  test("sends nothing while it's off, and costs the shopper no wait when it's on", async () => {
    await trackMeta(event);
    await flush();
    expect(fetcher).not.toHaveBeenCalled();

    await turnOn();
    await trackMeta(event);
    expect(fetcher).not.toHaveBeenCalled();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("sends nothing without the access token", async () => {
    await turnOn();
    context.mockResolvedValue({ env: {} });
    await trackMeta(event);
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("carries the browser's ID, so Meta matches it with the pixel's copy", async () => {
    await turnOn();
    await trackMeta(event);
    await flush();
    const [sent] = posted().data;
    expect(sent).toMatchObject({ event_name: "ViewContent", event_id: "abcdef123456", event_source_url: event.url, action_source: "website", custom_data: event.custom });
    expect(sent.user_data).toMatchObject({ client_ip_address: "203.0.113.9", client_user_agent: "Mozilla/5.0", fbp: "fb.1.1.2", fbc: "fb.1.1.click", external_id: [sha("visitor1234567")] });
    expect(sent.user_data.em).toBeUndefined();
  });
});

describe("trackPurchase", () => {
  async function place() {
    const result = await placeOrder(store.db, {
      customer,
      lines: [
        { variantId: DARK_BROWN_S, quantity: 2 },
        { variantId: BURGUNDY_S, quantity: 1 },
      ],
    });
    if (!result.ok) throw new Error("order not placed");
    return result;
  }

  test("reports the whole order, with every item and the customer's details hashed", async () => {
    await turnOn();
    const { token, number } = await place();
    await trackPurchase(token);
    await flush();
    const [sent] = posted().data;
    expect(sent).toMatchObject({ event_name: "Purchase", event_id: `purchase-${number}`, action_source: "website" });
    expect(sent.custom_data).toEqual({
      currency: "PKR",
      value: 54897,
      order_id: String(number),
      content_type: "product",
      content_ids: [DARK_BROWN_S, BURGUNDY_S],
      contents: [
        { id: DARK_BROWN_S, quantity: 2, item_price: 17999 },
        { id: BURGUNDY_S, quantity: 1, item_price: 17999 },
      ],
      num_items: 3,
    });
    expect(sent.user_data).toMatchObject({ em: [sha("ayesha@example.com")], ph: [sha("923001234567")], fn: [sha("ayesha")], ln: [sha("khan")], ct: [sha("lahore")] });
    expect(JSON.stringify(posted())).not.toContain("ayesha@example.com");
  });

  test("never sends the order's private link", async () => {
    await turnOn();
    const { token } = await place();
    await trackPurchase(token);
    await flush();
    expect(fetcher.mock.calls[0][1].body).not.toContain(token);
    expect(posted().data[0].event_source_url).toBe("https://klaev.com/checkout");
  });

  test("a refused event doesn't fail the order", async () => {
    await turnOn();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetcher.mockRejectedValue(new Error("network down"));
    const { token } = await place();
    await trackPurchase(token);
    await expect(flush()).resolves.toBeUndefined();
    log.mockRestore();
  });
});
