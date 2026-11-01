import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metaEvent } from "./meta-client";

const beacon = vi.fn().mockReturnValue(true);
const fbq = vi.fn();

const sent = async () => JSON.parse(await (beacon.mock.calls[0][1] as Blob).text());

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  window.fbq = fbq;
  window.history.pushState({}, "", "/products/black-jacket?fbclid=abc");
});

afterEach(() => {
  delete window.fbq;
});

describe("metaEvent", () => {
  it("does nothing while Meta is off", () => {
    delete window.fbq;
    metaEvent("PageView");
    expect(beacon).not.toHaveBeenCalled();
  });

  it("tells the pixel and the server, under one ID so Meta counts it once", async () => {
    metaEvent("ViewContent", { value: 17999, content_ids: ["black-jacket"] });
    const [command, name, custom, options] = fbq.mock.calls[0];
    expect([command, name]).toEqual(["track", "ViewContent"]);
    expect(custom).toEqual({ value: 17999, content_ids: ["black-jacket"], currency: "PKR" });
    const body = await sent();
    expect(beacon.mock.calls[0][0]).toBe("/api/m");
    expect(body).toMatchObject({ name: "ViewContent", id: options.eventID, data: { value: 17999 } });
    expect(body.url).toBe(`${location.origin}/products/black-jacket`);
  });

  it("never runs on an order page, whose address is the customer's private link", () => {
    window.history.pushState({}, "", "/orders/abcdefghijklmnopqrstuvwx");
    metaEvent("PageView");
    expect(fbq).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("never gets in the way of the page", () => {
    fbq.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(() => metaEvent("PageView")).not.toThrow();
  });
});
