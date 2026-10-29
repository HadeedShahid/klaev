// @vitest-environment node
import { describe, expect, it } from "vitest";

import { edgeCache, STORE_TAG } from "./edge-cache";

const KEPT = "s-maxage=31536000";

function page(path: string, init: { method?: string; status?: number; cacheControl?: string; cookie?: boolean } = {}) {
  const headers = new Headers({ "content-type": "text/html; charset=utf-8", vary: "rsc, next-router-state-tree" });
  if (init.cacheControl) headers.set("cache-control", init.cacheControl);
  if (init.cookie) headers.set("set-cookie", "klaev_cart=abc; Path=/");
  const request = new Request(`https://klaev.com${path}`, { method: init.method ?? "GET" });
  const response = new Response(init.status === 204 ? null : "<html>page</html>", { status: init.status ?? 200, headers });
  return edgeCache(request, response);
}

describe("edgeCache", () => {
  it("keeps a page Next keeps for a day at most, under the store's tag", async () => {
    const response = page("/products/black-biker-jacket", { cacheControl: KEPT });
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=86400");
    expect(response.headers.get("cache-tag")).toBe(STORE_TAG);
    expect(response.headers.get("vary")).toBe("rsc, next-router-state-tree");
    expect(response.headers.has("cloudflare-cdn-cache-control")).toBe(false);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<html>page</html>");
  });

  it("keeps nothing else at the edge, and leaves what the browser may keep as it was", () => {
    const pages = [
      page("/cart", { cacheControl: "private, no-cache, no-store, max-age=0, must-revalidate" }),
      page("/robots.txt", { cacheControl: "public, max-age=0, must-revalidate" }),
      page("/icon.png", { cacheControl: "public, max-age=3600" }),
      // Workers Cache keeps a 200 with no Cache-Control for two hours unless told otherwise.
      page("/admin/receipts/7"),
      page("/media/products/photo.webp"),
    ];
    for (const response of pages) {
      expect(response.headers.has("cache-tag")).toBe(false);
      expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("no-store");
    }
    expect(pages[0].headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    expect(pages[1].headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
    expect(pages[2].headers.get("cache-control")).toBe("public, max-age=3600");
    expect(pages[3].headers.has("cache-control")).toBe(false);
  });

  it("never keeps the admin, the API, a cookie, a redirect or a missing page, whatever Next says", () => {
    const pages = [
      page("/admin/orders", { cacheControl: KEPT }),
      page("/api/e", { cacheControl: KEPT }),
      page("/", { cacheControl: KEPT, cookie: true }),
      page("/products/old-belt", { cacheControl: KEPT, status: 307 }),
      page("/products/nothing", { cacheControl: KEPT, status: 404 }),
      page("/", { cacheControl: KEPT, method: "POST" }),
    ];
    for (const response of pages) {
      expect(response.headers.has("cache-tag")).toBe(false);
      expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("no-store");
      expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    }
  });

  it("keeps a HEAD request's answer like the page's", () => {
    const response = page("/", { cacheControl: KEPT, method: "HEAD" });
    expect(response.headers.get("cache-tag")).toBe(STORE_TAG);
  });
});
