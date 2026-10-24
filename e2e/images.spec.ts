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
