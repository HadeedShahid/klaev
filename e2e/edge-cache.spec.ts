import { expect, test, type APIRequestContext } from "@playwright/test";

// worker.ts sets what Workers Cache keeps (lib/edge-cache.ts). next dev doesn't run it, so these check
// the Cloudflare build: the local preview (pnpm cf:preview) or the deployed Worker, through BASE_URL.
const base = process.env.BASE_URL;
// Workers Cache itself runs only on Cloudflare; the local preview has none.
const deployed = !!base && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);

async function caching(request: APIRequestContext, path: string) {
  const response = await request.get(path, { maxRedirects: 0 });
  return { status: response.status(), control: response.headers()["cache-control"], tag: response.headers()["cache-tag"] };
}

test.describe("Workers Cache", () => {
  test.skip(!base, "next dev doesn't run worker.ts");

  test("store pages are kept for a day under the store's tag", async ({ request }) => {
    const home = await (await request.get("/")).text();
    const product = home.match(/href="(\/products\/[a-z0-9-]+)"/)?.[1];
    expect(product).toBeTruthy();

    for (const path of ["/", "/collections/all", product!, "/blogs/blog", "/pages/about"]) {
      expect(await caching(request, path), path).toEqual({
        status: 200,
        control: "public, max-age=0, s-maxage=86400",
        tag: "store",
      });
    }
  });

  test("the cart, checkout, the admin, robots.txt and a missing page are never kept", async ({ request }) => {
    for (const path of ["/cart", "/checkout", "/admin/login", "/robots.txt", "/products/no-such-jacket"]) {
      const { control, tag } = await caching(request, path);
      expect(tag, path).toBeUndefined();
      expect(control ?? "", path).not.toContain("s-maxage");
    }
  });

  test("on Cloudflare, a store page comes from the cache the second time, and the cart and admin never do", async ({ request }) => {
    test.skip(!deployed, "Workers Cache runs only on Cloudflare");
    for (const path of ["/pages/about", "/collections/all"]) {
      await request.get(path);
      expect((await request.get(path)).headers()["cf-cache-status"], path).toBe("HIT");
    }
    for (const path of ["/cart", "/admin/login", "/robots.txt"]) {
      await request.get(path);
      expect((await request.get(path)).headers()["cf-cache-status"] ?? "", path).not.toBe("HIT");
    }
  });
});
