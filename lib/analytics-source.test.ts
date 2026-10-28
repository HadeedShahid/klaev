import { describe, expect, test } from "vitest";

import { classifySource, deviceOf, isBot } from "./analytics-source";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

describe("where a visit came from", () => {
  test("a tagged link wins, then ad click ids, then the in-app browser, then the referrer", () => {
    expect(classifySource({ utmSource: "IG", referrer: "https://www.google.com/" })).toEqual({ source: "instagram", referrer: "google.com" });
    expect(classifySource({ utmSource: "newsletter" })).toEqual({ source: "other", referrer: null });
    expect(classifySource({ gclid: true })).toMatchObject({ source: "google" });
    expect(classifySource({ userAgent: `${IPHONE} Instagram 350.0` })).toMatchObject({ source: "instagram" });
    expect(classifySource({ userAgent: `${ANDROID} [FBAN/EMA;FBAV/400.0]` })).toMatchObject({ source: "facebook" });
    expect(classifySource({ fbclid: true })).toMatchObject({ source: "facebook" });
    expect(classifySource({ referrer: "https://l.instagram.com/?u=x" })).toEqual({ source: "instagram", referrer: "l.instagram.com" });
    expect(classifySource({ referrer: "https://www.google.com.pk/" })).toMatchObject({ source: "google" });
    expect(classifySource({ referrer: "https://web.whatsapp.com/" })).toMatchObject({ source: "whatsapp" });
    expect(classifySource({ referrer: "https://someblog.pk/post" })).toEqual({ source: "other", referrer: "someblog.pk" });
  });

  test("no referrer, a broken one, or the store's own pages is direct", () => {
    expect(classifySource({})).toEqual({ source: "direct", referrer: null });
    expect(classifySource({ referrer: "not a url" })).toEqual({ source: "direct", referrer: null });
    expect(classifySource({ referrer: "https://klaev.com/collections/all", ownHost: "klaev.com" })).toEqual({ source: "direct", referrer: null });
  });
});

describe("devices and bots", () => {
  test("phones, tablets and desktops", () => {
    expect(deviceOf(IPHONE)).toBe("phone");
    expect(deviceOf(ANDROID)).toBe("phone");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15")).toBe("desktop");
  });

  test("crawlers and link previews aren't visitors", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot(IPHONE)).toBe(false);
    expect(isBot(`${IPHONE} Instagram 350.0`)).toBe(false);
  });
});
