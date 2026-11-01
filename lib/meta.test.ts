// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { META_API, metaUser, parseBrowserEvent, postToMeta, validPixelId } from "./meta";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

afterEach(() => vi.unstubAllGlobals());

describe("metaUser", () => {
  it("hashes what identifies the customer, in the form Meta matches on", async () => {
    const user = await metaUser({
      email: "  Ayesha@Example.com ",
      phone: "+923001234567",
      name: "Ayesha Khan Malik",
      city: "Dera Ghazi Khan",
      visitorId: "abc123",
      address: "203.0.113.9",
      userAgent: "Mozilla/5.0",
      fbp: "fb.1.1700000000000.123",
      fbc: "fb.1.1700000000000.click",
    });
    expect(user).toEqual({
      em: [sha("ayesha@example.com")],
      ph: [sha("923001234567")],
      fn: [sha("ayesha")],
      ln: [sha("khan malik")],
      ct: [sha("deraghazikhan")],
      country: [sha("pk")],
      external_id: [sha("abc123")],
      client_ip_address: "203.0.113.9",
      client_user_agent: "Mozilla/5.0",
      fbp: "fb.1.1700000000000.123",
      fbc: "fb.1.1700000000000.click",
    });
  });

  it("leaves out what it doesn't have", async () => {
    expect(await metaUser({ email: null, phone: null, userAgent: "Mozilla/5.0" })).toEqual({ country: [sha("pk")], client_user_agent: "Mozilla/5.0" });
  });
});

describe("postToMeta", () => {
  const event = { event_name: "Purchase", event_time: 1700000000, event_id: "purchase-1023", event_source_url: "https://klaev.com/checkout", action_source: "website" as const, user_data: {} };

  it("posts to the Conversions API with the token in the body, never the address", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    expect(await postToMeta({ pixelId: "1234567890", token: "SECRET" }, [event])).toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(`${META_API}/1234567890/events`);
    expect(url).not.toContain("SECRET");
    expect(JSON.parse(init.body)).toEqual({ data: [event], access_token: "SECRET" });
  });

  it("marks test events when a test code is set", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    await postToMeta({ pixelId: "1234567890", token: "SECRET", testCode: "TEST123" }, [event]);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).test_event_code).toBe("TEST123");
  });

  it("never throws, and logs Meta's refusal without the token", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid parameter" } }), { status: 400 })));
    expect(await postToMeta({ pixelId: "1234567890", token: "SECRET" }, [event])).toBe(false);
    expect(log.mock.calls[0].join(" ")).toContain("Invalid parameter");
    expect(log.mock.calls[0].join(" ")).not.toContain("SECRET");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await postToMeta({ pixelId: "1234567890", token: "SECRET" }, [event])).toBe(false);
    log.mockRestore();
  });
});

describe("parseBrowserEvent", () => {
  const body = { name: "ViewContent", id: "abcdef123456", url: "https://klaev.com/products/black-jacket?fbclid=abc#top", data: { content_ids: ["black-jacket"], content_type: "product_group", content_name: "Black Jacket", value: 17999 } };

  it("keeps a well formed event, with the address cut to its path and PKR as the currency", () => {
    expect(parseBrowserEvent(body)).toEqual({
      name: "ViewContent",
      id: "abcdef123456",
      url: "https://klaev.com/products/black-jacket",
      custom: { content_ids: ["black-jacket"], content_type: "product_group", content_name: "Black Jacket", value: 17999, currency: "PKR" },
    });
  });

  it("only sets a currency when there's an amount", () => {
    expect(parseBrowserEvent({ name: "PageView", id: "abcdef123456", url: "https://klaev.com/" })?.custom).toEqual({});
  });

  it("refuses a Purchase: those come only from the server, once the order is saved", () => {
    expect(parseBrowserEvent({ ...body, name: "Purchase" })).toBeNull();
  });

  it("refuses an order page, whose address is the customer's private link", () => {
    expect(parseBrowserEvent({ ...body, url: "https://klaev.com/orders/abcdefghijklmnopqrstuvwx" })).toBeNull();
  });

  it("refuses anything malformed, and drops what it doesn't know", () => {
    expect(parseBrowserEvent({ ...body, name: "Nonsense" })).toBeNull();
    expect(parseBrowserEvent({ ...body, id: "x" })).toBeNull();
    expect(parseBrowserEvent({ ...body, url: "not a url" })).toBeNull();
    expect(parseBrowserEvent(null)).toBeNull();
    const parsed = parseBrowserEvent({ ...body, data: { value: -5, content_ids: "nope", email: "someone@example.com", num_items: 2 } });
    expect(parsed?.custom).toEqual({ num_items: 2 });
  });
});

describe("validPixelId", () => {
  it("is digits only", () => {
    expect(validPixelId("1234567890123456")).toBe(true);
    expect(validPixelId("12")).toBe(false);
    expect(validPixelId("abc'); alert(1)//")).toBe(false);
  });
});
