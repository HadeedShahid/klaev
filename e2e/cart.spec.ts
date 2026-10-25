import { expect, test } from "@playwright/test";

const CROPPED = "/products/dark-brown-cropped-sheepskin-leather-jacket";
const TITLE = "Dark Brown Cropped Sheepskin Leather Jacket";

test.describe("cart", () => {
  test("starts empty", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();
  });

  test("lists what was added, with size, price and both ways to pay", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByRole("radio", { name: /^M\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();
    await page.getByRole("link", { name: "View cart" }).click();

    await expect(page).toHaveURL("/cart");
    const line = page.getByRole("listitem").filter({ hasText: TITLE });
    await expect(line).toContainText("Size M");
    await expect(line).toContainText("PKR 17,999");
    await expect(page.getByTestId("cart-subtotal").filter({ visible: true })).toHaveText("PKR 17,999");
    await expect(page.getByTestId("pay-cod").filter({ visible: true })).toContainText("PKR 16,899");
    await expect(page.getByTestId("pay-bank").filter({ visible: true })).toContainText("PKR 17,999");
    await expect(page.getByText("No refunds.").filter({ visible: true })).toBeVisible();
  });

  test("checkout is the way on, and the order can still go on WhatsApp with its contents", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByRole("radio", { name: /^M\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
    const order = page.getByRole("link", { name: "Send your order on WhatsApp" });
    const href = (await order.getAttribute("href")) ?? "";
    expect(href).toMatch(/^https:\/\/wa\.me\/923231483650\?text=/);
    const message = new URL(href).searchParams.get("text") ?? "";
    expect(message).toContain(`${TITLE}, size M`);
    expect(message).toContain("PKR 17,999");
    await expect(page.getByText(/part of the build/)).toHaveCount(0);
  });

  test("adding the same size twice raises the quantity", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByRole("radio", { name: /^S\b/ }).check();
    const buy = page.getByTestId("buy-button").filter({ visible: true });
    await buy.click();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
    await buy.click();
    await expect(page.getByRole("link", { name: "Cart, 2 items" })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByTestId("cart-subtotal").filter({ visible: true })).toHaveText("PKR 35,998");
  });

  test("removing the last line empties the cart", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByRole("radio", { name: /^M\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();

    await page.goto("/cart");
    await page.getByRole("button", { name: `Remove ${TITLE}, size M` }).click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();
  });

  test("the cart count follows the shopper onto static pages", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByRole("radio", { name: /^M\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
    await page.goto("/collections/all");
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
  });
});
