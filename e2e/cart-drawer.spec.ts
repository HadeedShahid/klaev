import { expect, test } from "@playwright/test";

const PRODUCT = "/products/dark-brown-cropped-sheepskin-leather-jacket";
const TITLE = "Dark Brown Cropped Sheepskin Leather Jacket";

// The drawer is on by default (NEXT_PUBLIC_CART_DRAWER, lib/flags.ts).
test.describe("cart drawer", () => {
  test("adding a jacket slides in the drawer with the jacket, the total and Checkout", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.getByRole("radio", { name: /^M\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();

    const drawer = page.getByRole("dialog", { name: "Cart" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Cart" })).toBeFocused();
    const line = drawer.getByRole("listitem").filter({ hasText: TITLE });
    await expect(line).toContainText("Size M");
    await expect(line).toContainText("PKR 17,999");
    await expect(drawer.getByTestId("drawer-subtotal")).toHaveText("PKR 17,999");
    await expect(drawer.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");

    await drawer.getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL("/cart");
  });

  test("the cart icon opens the drawer, and Escape closes it back onto the icon", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.getByRole("link", { name: "Cart, 0 items" }).click();
    const drawer = page.getByRole("dialog", { name: "Cart" });
    await expect(drawer.getByText("Your cart is empty")).toBeVisible();
    await expect(page).toHaveURL(PRODUCT);
    // The drawer opens on its title, not on the close button, so no focus ring greets a tap.
    await expect(drawer.getByRole("heading", { name: "Cart" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeFocused();
  });

  test("removing the last jacket in the drawer empties it and the header count", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.getByRole("radio", { name: /^S\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();
    const drawer = page.getByRole("dialog", { name: "Cart" });
    await drawer.getByRole("button", { name: `Remove ${TITLE}, size S` }).click();
    await expect(drawer.getByText("Your cart is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeAttached();
  });
});
