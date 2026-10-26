import { expect, test } from "@playwright/test";

const PRODUCT = "/products/dark-brown-cropped-sheepskin-leather-jacket";
const TITLE = "Dark Brown Cropped Sheepskin Leather Jacket";

test.describe("breadcrumbs", () => {
  test("on a phone the trail closes the product page, after the other jackets", async ({ page }) => {
    await page.goto(PRODUCT);
    const trail = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(trail).toHaveCount(1);
    await expect(trail.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(trail.getByRole("link", { name: "Cropped Leather Jackets" })).toHaveAttribute(
      "href",
      "/collections/cropped-leather-jackets",
    );
    await expect(trail.getByText(TITLE)).toHaveAttribute("aria-current", "page");

    const more = await page.getByRole("heading", { name: "More from Klaev" }).boundingBox();
    const crumbs = await trail.boundingBox();
    expect(crumbs!.y).toBeGreaterThan(more!.y);
  });

  test("on a phone the trail sits on the footer, and the footer clears the Add to cart bar", async ({ page }) => {
    await page.goto(PRODUCT);
    const crumbs = await page.getByRole("navigation", { name: "Breadcrumb" }).boundingBox();
    const footer = page.getByRole("contentinfo");
    const top = await footer.boundingBox();
    expect(Math.abs(top!.y - (crumbs!.y + crumbs!.height))).toBeLessThan(1);

    // The room the fixed bar covers is the footer's own, below its last line. (Instant: the page
    // scrolls smoothly otherwise, and would be measured mid-glide.)
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    const bar = await page.getByTestId("buy-bar").boundingBox();
    const lastLine = await footer.locator("p, a").last().boundingBox();
    expect(lastLine!.y + lastLine!.height).toBeLessThanOrEqual(bar!.y);
  });

  test("on a wide screen the trail leads the page, top left", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PRODUCT);
    const trail = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(trail).toHaveCount(1);
    const crumbs = await trail.boundingBox();
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(crumbs!.y).toBeLessThan(title!.y);
    expect(crumbs!.x).toBeLessThan(200);
  });

  test("a collection's trail names the collection, and search engines get the same trail", async ({ page }) => {
    await page.goto("/collections/cropped-leather-jackets");
    const trail = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(trail.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(trail.getByText("Cropped Leather Jackets")).toHaveAttribute("aria-current", "page");

    await page.goto(PRODUCT);
    const data = await page.locator('script[type="application/ld+json"]').allTextContents();
    const crumbs = data.map((text) => JSON.parse(text)).find((entry) => entry["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((item: { name: string }) => item.name)).toEqual([
      "Home",
      "Cropped Leather Jackets",
      TITLE,
    ]);
    expect(crumbs.itemListElement[2].item).toBe(`https://klaev.com${PRODUCT}`);
  });
});
