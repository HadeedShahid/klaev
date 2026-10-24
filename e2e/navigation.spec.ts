import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

const LAMBSKIN = "/products/black-lambskin-leather-jacket";

test.describe("instant navigation", () => {
  test("a product page's name and price are in the static shell", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto(LAMBSKIN);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Black Lambskin Leather Jacket");
        await expect(page.getByTestId("product-price").filter({ visible: true })).toHaveText("PKR 14,999");
      },
      { baseURL },
    );
  });

  test("tapping a product from the shop opens it instantly", async ({ page }) => {
    await page.goto("/collections/all");
    await instant(page, async () => {
      await page.getByRole("link", { name: /Black Lambskin Leather Jacket/ }).click();
      await page.waitForURL((url) => url.pathname === LAMBSKIN);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Black Lambskin Leather Jacket");
    });
  });
});
