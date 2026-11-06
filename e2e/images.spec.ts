import { expect, test, type Page } from "@playwright/test";

// A photo that silently fails to load reads as an empty grey tile, so every visible photo must decode.
async function brokenImages(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(100);
  }
  await page
    .waitForFunction(
      () =>
        Array.from(document.images)
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return img.getClientRects().length > 0 && rect.left < window.innerWidth && rect.right > 0;
          })
          .every((img) => img.complete),
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => {});
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => {
        const rect = img.getBoundingClientRect();
        return img.getClientRects().length > 0 && rect.left < window.innerWidth && rect.right > 0;
      })
      .filter((img) => !(img.complete && img.naturalWidth > 0))
      .map((img) => img.currentSrc || img.src),
  );
}

for (const path of ["/", "/collections/all", "/products/dark-brown-cropped-sheepskin-leather-jacket"]) {
  test(`every visible photo on ${path} loads`, async ({ page }) => {
    await page.goto(path);
    expect(await brokenImages(page)).toEqual([]);
  });
}

// The photo a shopper waits for, and the one Google times, is fetched first: a product's first
// photo and a collection's first jacket. On a slow phone connection everything else shares the line,
// so the rest wait their turn; the second jacket shares the first row on a phone, so it loads at once.
test("the main photo on product and collection pages is fetched first", async ({ page }) => {
  await page.goto("/products/dark-brown-cropped-sheepskin-leather-jacket");
  const photos = page.getByRole("list", { name: "Photos" }).first().getByRole("img");
  await expect(photos.first()).toHaveAttribute("fetchpriority", "high");
  await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1);

  await page.goto("/collections/all");
  const cards = page.getByRole("main").getByRole("listitem").getByRole("img");
  await expect(cards.nth(0)).toHaveAttribute("fetchpriority", "high");
  await expect(cards.nth(0)).toHaveAttribute("loading", "eager");
  await expect(cards.nth(1)).toHaveAttribute("loading", "eager");
  await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1);
  await expect(cards.nth(2)).toHaveAttribute("loading", "lazy");
});
