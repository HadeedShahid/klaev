import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Where a request is sent, without following it: the status and the path it points to.
async function landing(request: APIRequestContext, path: string) {
  const response = await request.get(path, { maxRedirects: 0 });
  const location = response.headers()["location"];
  return { status: response.status(), to: location ? new URL(location, "http://store").pathname : null };
}

async function structuredData(page: Page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.map((text) => JSON.parse(text));
}

test.describe("search engines", () => {
  test("the sitemap lists the live store at klaev.com, with photos, and leaves hidden products out", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const xml = await response.text();
    for (const path of [
      "/",
      "/collections/all",
      "/collections/cropped-leather-jackets",
      "/products/dark-brown-cropped-sheepskin-leather-jacket",
      "/pages/about",
      "/pages/contact",
      "/pages/jackets-size-chart",
      "/policies/refund-policy",
      "/policies/privacy-policy",
      "/blogs/blog",
    ]) {
      expect(xml, path).toContain(`<loc>https://klaev.com${path}</loc>`);
    }
    expect(xml).toContain("<image:loc>");
    expect(xml).not.toContain("leather-belt");
    expect(xml).not.toMatch(/\/(cart|checkout|track|orders)\b/);
  });

  test("robots.txt opens klaev.com to crawlers, and keeps them off any other address", async ({ request, baseURL }) => {
    const text = await (await request.get("/robots.txt")).text();
    if (new URL(baseURL!).host === "klaev.com") {
      expect(text).toContain("Disallow: /checkout");
      expect(text).toContain("Sitemap: https://klaev.com/sitemap.xml");
    } else {
      expect(text).toMatch(/^Disallow: \/$/m);
    }
  });

  test("Shopify's old addresses lead to their places in the new store", async ({ request }) => {
    for (const [from, status, to] of [
      ["/collections/cropped-leather-jackets/products/black-cropped-leather-jacket", 308, "/products/black-cropped-leather-jacket"],
      ["/collections/all/products/black-suede-jacket", 308, "/products/black-suede-jacket"],
      ["/collections/leather-jackets/black", 308, "/collections/leather-jackets"],
      ["/products", 308, "/collections/all"],
      ["/collections", 307, "/collections/all"],
      ["/search?q=suede", 307, "/collections/all"],
      ["/account", 307, "/track"],
      ["/account/login", 307, "/track"],
      ["/62407966791/orders/0f1e2d3c4b5a/authenticate?key=abc", 308, "/track"],
      ["/62407966791/checkouts/cn/abc123", 308, "/cart"],
      ["/checkouts/cn/abc123", 308, "/cart"],
      ["/cart/49253873647687:1", 308, "/cart"],
      ["/blogs/blog/tagged/style", 308, "/blogs/blog"],
      ["/sitemap_products_1.xml?from=1&to=2", 308, "/sitemap.xml"],
    ] as const) {
      expect(await landing(request, from), from).toEqual({ status, to });
    }
    // The catch-alls leave the store's own pages alone.
    expect((await request.get("/cart", { maxRedirects: 0 })).status()).toBe(200);
    expect((await request.get("/collections/all", { maxRedirects: 0 })).status()).toBe(200);
  });

  test("a hidden product or collection (the belts) sends visitors to what's on sale; unknown ones are a 404", async ({ request }) => {
    expect(await landing(request, "/products/black-studded-leather-belt")).toEqual({ status: 307, to: "/collections/all" });
    expect(await landing(request, "/collections/leather-belts")).toEqual({ status: 307, to: "/collections/all" });
    expect((await request.get("/products/no-such-jacket")).status()).toBe(404);
    expect((await request.get("/collections/no-such-collection")).status()).toBe(404);
  });

  test("a product page names its one address and gives search engines its price, stock and photos", async ({ page }) => {
    await page.goto("/products/dark-brown-cropped-sheepskin-leather-jacket?variant=49253873647687");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://klaev.com/products/dark-brown-cropped-sheepskin-leather-jacket");
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Klaev");
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", "https://klaev.com/products/dark-brown-cropped-sheepskin-leather-jacket");

    const product = (await structuredData(page)).find((entry) => entry["@type"] === "Product");
    expect(product).toMatchObject({
      name: "Dark Brown Cropped Sheepskin Leather Jacket",
      brand: { name: "Klaev" },
      offers: { price: 17999, priceCurrency: "PKR", availability: "https://schema.org/InStock" },
    });
    expect(product.image.length).toBeGreaterThan(1);
  });

  test("the home page has its search title and introduces the store", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Klaev | Leather Jackets in Pakistan");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /cash on delivery or by bank transfer/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/klaev\.com\/?$/);
    const graph = (await structuredData(page)).find((entry) => entry["@graph"])["@graph"];
    expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["OnlineStore", "WebSite"]);
  });

  test("a collection page has its own search title, description and address", async ({ page }) => {
    await page.goto("/collections/suede-jackets?sort=price");
    await expect(page).toHaveTitle("Men’s Suede Jackets in Pakistan | Klaev");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /goatskin suede/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://klaev.com/collections/suede-jackets");
  });

  test("a shared link shows a picture: the store's own preview, or the page's photo at a size WhatsApp takes", async ({ page, request }) => {
    const preview = async () => ({
      url: await page.locator('meta[property="og:image"]').first().getAttribute("content"),
      width: await page.locator('meta[property="og:image:width"]').first().getAttribute("content"),
      height: await page.locator('meta[property="og:image:height"]').first().getAttribute("content"),
    });
    const own = { url: "https://klaev.com/og/klaev.jpg", width: "1200", height: "630" };
    for (const path of ["/", "/policies/refund-policy", "/pages/contact", "/blogs/blog"]) {
      await page.goto(path);
      expect(await preview(), path).toEqual(own);
    }
    // WhatsApp drops a preview picture over about 300 KB.
    const file = await request.get("/og/klaev.jpg");
    expect(file.headers()["content-type"]).toBe("image/jpeg");
    expect((await file.body()).length).toBeLessThan(300_000);

    await page.goto("/products/dark-brown-cropped-sheepskin-leather-jacket");
    const product = await preview();
    expect(product.url).toMatch(/^https:\/\/.+\/products\/dark-brown-cropped-sheepskin-leather-jacket\/[0-9a-f]{12}-1200\.webp$/);
    expect([product.width, product.height]).toEqual(["1200", "1499"]);

    await page.goto("/collections/suede-jackets");
    expect((await preview()).url).toMatch(/\/products\/black-suede-jacket\/[0-9a-f]{12}-1200\.webp$/);
  });

  test("the browser tab, the home screen and Google show the Klaev icon", async ({ page, request }) => {
    await page.goto("/");
    const icons = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((links) =>
      links.map((link) => ({ rel: link.getAttribute("rel"), href: new URL((link as HTMLLinkElement).href).pathname, sizes: link.getAttribute("sizes") })),
    );
    expect(icons).toEqual(
      expect.arrayContaining([
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        { rel: "icon", href: "/icon.png", sizes: "512x512" },
        { rel: "apple-touch-icon", href: "/apple-icon.png", sizes: "180x180" },
      ]),
    );
    for (const path of ["/favicon.ico", "/icon.png", "/apple-icon.png"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
  });

  test("the cart and checkout stay out of search results", async ({ page }) => {
    for (const path of ["/cart", "/checkout"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute("content", /noindex/);
    }
  });
});
