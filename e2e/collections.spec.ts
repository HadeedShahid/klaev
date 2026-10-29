import { expect, test } from "@playwright/test";

test.describe("collections", () => {
  test("a line lists its jackets", async ({ page }) => {
    await page.goto("/collections/cropped-leather-jackets");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cropped Leather Jackets");
    await expect(page.getByRole("main").getByRole("link", { name: /Cropped Sheepskin Leather Jacket/ })).toHaveCount(3);
  });

  test("shop all lists every jacket and no belts", async ({ page }) => {
    await page.goto("/collections/all");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop all");
    await expect(page.getByRole("main").getByRole("link", { name: /Jacket/ })).toHaveCount(6);
    expect(await page.locator("main").innerText()).not.toMatch(/belt/i);
  });

  test("the header's Shop link opens shop all", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Shop" }).click();
    await page.waitForURL("**/collections/all");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop all");
  });

  for (const path of ["/collections/not-a-collection", "/products/not-a-jacket"]) {
    test(`${path} is not on the site`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't here");
    });
  }

  // The belts are hidden for now, but old links to them still lead somewhere to shop (e2e/seo.spec.ts).
  for (const path of ["/collections/leather-belts", "/products/black-stitched-leather-belt"]) {
    test(`${path} opens shop all while the belts are hidden`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL("**/collections/all");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop all");
    });
  }
});
