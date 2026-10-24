import { expect, test } from "@playwright/test";

// Brand rules from PRODUCT.md that a careless copy edit could break.
const PAGES = [
  "/",
  "/collections/all",
  "/collections/cropped-leather-jackets",
  "/products/dark-brown-cropped-sheepskin-leather-jacket",
  "/products/black-suede-jacket",
  "/cart",
];

for (const path of PAGES) {
  test(`${path} keeps the brand rules`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator("body").innerText();

    expect(text, "the courier is never named on the storefront").not.toMatch(/postex/i);
    expect(text, "no em or en dashes").not.toMatch(/[–—]/);
    expect(text, "PKR is the only currency").not.toMatch(/(\$|€|£|\bUSD\b|\bRs\.?\s)/);
  });
}
