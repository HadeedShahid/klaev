import { expect, type Page } from "@playwright/test";

// Adds the product on the current page to the cart (choosing `size` first when given), then closes
// the cart drawer that slides in, so the test can carry on with the page.
export async function addToCart(page: Page, size?: string) {
  if (size) await page.getByRole("radio", { name: new RegExp(`^${size}\\b`) }).check();
  await page.getByTestId("buy-button").filter({ visible: true }).click();
  const drawer = page.getByRole("dialog", { name: "Cart" });
  await expect(drawer.getByRole("listitem").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
}
