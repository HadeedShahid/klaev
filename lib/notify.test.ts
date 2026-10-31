// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "./db/test-db";
import { orders, settings } from "./db/schema";
import { placeOrder } from "./orders";

const { after, context, requestHeaders, db } = vi.hoisted(() => ({ after: vi.fn(), context: vi.fn(), requestHeaders: vi.fn(), db: vi.fn() }));

vi.mock("next/server", () => ({ after }));
vi.mock("next/headers", () => ({ headers: requestHeaders }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
vi.mock("@/lib/db", async (original) => ({ ...(await original<typeof import("@/lib/db")>()), getDb: db }));

const { notifyMessage, notifyOrderPlaced, notifyReceipt, notifyShipped } = await import("./notify");

const DARK_BROWN_S = "49253873647687"; // 2 in stock
const BURGUNDY_S = "49142312730695"; // 1 in stock
const OWNER = "business.klaev@gmail.com";
const customer = { name: "Ayesha Khan", email: "ayesha@example.com", phone: "+923001234567", city: "Lahore", address: "House 1, Model Town", payment: "cod" as const };

let store: Awaited<ReturnType<typeof createTestDb>>;
const send = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
  send.mockResolvedValue({ messageId: "1" });
  db.mockResolvedValue(store.db);
  context.mockResolvedValue({ env: { EMAIL: { send } } });
  requestHeaders.mockResolvedValue(new Headers({ host: "klaev.com" }));
}, 60_000);

afterAll(() => store?.dispose());

async function place(values: typeof customer | (Omit<typeof customer, "email"> & { email: string }) = customer) {
  const result = await placeOrder(store.db, { customer: values, lines: [{ variantId: DARK_BROWN_S, quantity: 1 }] });
  if (!result.ok) throw new Error("order not placed");
  return result;
}

const flush = async () => {
  for (const [task] of after.mock.calls) await task();
};
const sentTo = (address: string) => send.mock.calls.map(([email]) => email).filter((email) => email.to === address);

describe("notifyOrderPlaced", () => {
  test("waits for the response, then tells the owner and the customer", async () => {
    const { token, number } = await place();
    await notifyOrderPlaced(token);
    expect(send).not.toHaveBeenCalled();

    await flush();
    expect(sentTo(OWNER)[0].subject).toBe(`New order #${number}, PKR 18,899, cash on delivery`);
    expect(sentTo(OWNER)[0].replyTo).toBe("ayesha@example.com");
    expect(sentTo("ayesha@example.com")[0].subject).toBe(`Order #${number} is in`);
    expect(sentTo("ayesha@example.com")[0].text).toContain(`https://klaev.com/orders/${token}`);
  });

  test("gives the bank account from the settings", async () => {
    await store.db.insert(settings).values({ key: "bank", value: { bank: "HBL", accountTitle: "Klaev", accountNumber: "1234567890" } });
    const { token } = await place();
    await notifyOrderPlaced(token);
    await flush();
    expect(sentTo("ayesha@example.com")[0].text).toContain("1234567890");
  });

  test("still tells the owner about a customer who gave no email", async () => {
    const { token } = await place({ ...customer, email: "" });
    await notifyOrderPlaced(token);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(sentTo(OWNER)).toHaveLength(1);
  });

  test("links to the preview when the order was placed there", async () => {
    requestHeaders.mockResolvedValue(new Headers({ host: "klaev.hadeed-shahid08.workers.dev" }));
    const { token } = await place();
    await notifyOrderPlaced(token);
    await flush();
    expect(sentTo("ayesha@example.com")[0].text).toContain(`https://klaev.hadeed-shahid08.workers.dev/orders/${token}`);
  });

  test("a failed customer email doesn't stop the owner's alert", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockImplementation(async (email) => {
      if (email.to !== OWNER) throw new Error("rejected");
      return { messageId: "1" };
    });
    const { token } = await place();
    await notifyOrderPlaced(token);
    await expect(flush()).resolves.toBeUndefined();
    expect(sentTo(OWNER)).toHaveLength(1);
    log.mockRestore();
  });
});

describe("notifyShipped", () => {
  test("tells the customer, with the tracking number", async () => {
    const { number } = await place();
    await store.db.update(orders).set({ status: "shipped", trackingNumber: "TRK12345" }).where(eq(orders.number, number));
    await notifyShipped(number);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    const [email] = sentTo("ayesha@example.com");
    expect(email.subject).toBe(`Order #${number} is on its way`);
    expect(email.text).toContain("TRK12345");
    expect(email.text).toContain("Keep PKR 18,899 ready in cash.");
  });

  test("sends nothing for a customer with no email", async () => {
    const { number } = await place({ ...customer, email: "" });
    await notifyShipped(number);
    await flush();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("an order with several products", () => {
  async function placeSeveral() {
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

  test("the customer sees every line, its quantity and its own amount, and the right totals", async () => {
    const { token } = await placeSeveral();
    await notifyOrderPlaced(token);
    await flush();
    const [{ text, html }] = sentTo("ayesha@example.com");
    for (const body of [text, html]) {
      expect(body).toContain("Dark Brown Cropped Sheepskin Leather Jacket");
      expect(body).toContain("Size S, quantity 2");
      expect(body).toContain("PKR 35,998");
      expect(body).toContain("Burgundy");
      expect(body).toContain("PKR 17,999");
      expect(body).toContain("PKR 53,997");
      expect(body).toContain("PKR 54,897");
      expect(body).toContain("The rest, PKR 52,897, is paid in cash when it arrives.");
    }
    expect(html.match(/<img /g)).toHaveLength(2);
  });

  test("the owner's alert lists them all", async () => {
    const { token, number } = await placeSeveral();
    await notifyOrderPlaced(token);
    await flush();
    const [{ subject, text }] = sentTo(OWNER);
    expect(subject).toBe(`New order #${number}, PKR 54,897, cash on delivery`);
    expect(text).toContain("Dark Brown Cropped Sheepskin Leather Jacket. Size S, quantity 2.");
    expect(text).toContain("Burgundy");
  });

  test("the shipped email lists them all, and the cash for the whole order", async () => {
    const { number } = await placeSeveral();
    await store.db.update(orders).set({ status: "shipped", trackingNumber: "TRK12345" }).where(eq(orders.number, number));
    await notifyShipped(number);
    await flush();
    const [{ text }] = sentTo("ayesha@example.com");
    expect(text).toContain("Size S, quantity 2");
    expect(text).toContain("Burgundy");
    expect(text).toContain("Keep PKR 54,897 ready in cash.");
  });
});

describe("notifyReceipt", () => {
  test("tells the owner which order to check", async () => {
    const { number } = await place();
    await notifyReceipt(number);
    await flush();
    expect(sentTo(OWNER)[0].subject).toBe(`Receipt uploaded for order #${number}`);
  });
});

describe("notifyMessage", () => {
  test("tells the owner, and a reply goes to whoever wrote", async () => {
    await notifyMessage({ name: "Sara", email: "sara@example.com", phone: null, subject: "exchange", body: "Can I swap?" });
    await flush();
    const [email] = sentTo(OWNER);
    expect(email.subject).toBe("Message from Sara: An exchange");
    expect(email.replyTo).toBe("sara@example.com");
  });

  test("replies stay with the store when they left only a phone number", async () => {
    await notifyMessage({ name: "Sara", email: null, phone: "+923001112222", subject: "general", body: "Hello" });
    await flush();
    expect(sentTo(OWNER)[0].replyTo).toBe(OWNER);
  });
});
