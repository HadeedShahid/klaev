import { expect, test, type Page } from "@playwright/test";

import { addToCart as addSize } from "./helpers";

// Placing an order writes to the database and takes stock, so those tests run only against a local
// server, whose database `pnpm db:setup` resets. Against the deployed preview they are skipped.
const base = process.env.BASE_URL;
const placesOrders = !base || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);

// A 1 by 1 PNG, standing in for a phone screenshot of a bank transfer.
const RECEIPT = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function addToCart(page: Page, path: string, size: string) {
  await page.goto(path);
  await addSize(page, size);
  await expect(page.getByRole("link", { name: /^Cart, [1-9]/ })).toBeVisible();
}

async function fillDetails(page: Page) {
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByLabel("Email").fill("ayesha@example.com");
  await page.getByLabel("City").fill("Lahore");
  await page.getByLabel("Full address").fill("House 1, Street 2, Model Town");
}

const bar = (page: Page) => page.getByTestId("checkout-bar");

// Orders take stock, and other suites expect dark brown's sizes and oxblood XL to stay in stock,
// so orders here buy sizes no other test looks at, one unit per phone.

test.describe("checkout", () => {
  test("the cart leads to checkout, which lists what is being bought", async ({ page }) => {
    await addToCart(page, "/products/dark-brown-cropped-sheepskin-leather-jacket", "M");
    await page.goto("/cart");
    await page.getByRole("link", { name: "Checkout" }).click();

    await expect(page).toHaveURL("/checkout");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout");
    const line = page.getByRole("listitem").filter({ hasText: "Dark Brown Cropped Sheepskin Leather Jacket" });
    await expect(line).toContainText("Size M");
    await expect(line).toContainText("PKR 17,999");
  });

  test("with nothing in the cart, checkout points back to the shop", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await expect(page.getByRole("link", { name: "See all products" })).toBeVisible();
  });

  test("the bottom bar says what to send now for each way to pay", async ({ page }) => {
    await addToCart(page, "/products/dark-brown-cropped-sheepskin-leather-jacket", "M");
    await page.goto("/checkout");

    await expect(page.getByRole("radio", { name: /^Cash on delivery/ })).toBeChecked();
    await expect(bar(page)).toContainText("PKR 2,000");
    await expect(bar(page)).toContainText("PKR 18,899");
    await expect(page.getByTestId("checkout-on-delivery")).toHaveText("PKR 16,899");

    await page.getByRole("radio", { name: /^Bank transfer/ }).check();
    await expect(bar(page)).toContainText("PKR 17,999");
    await expect(bar(page)).not.toContainText("PKR 2,000");
  });

  test("a discount code comes off the total before the order is placed, and a wrong one says why", async ({ page }) => {
    await addToCart(page, "/products/dark-brown-cropped-sheepskin-leather-jacket", "M");
    await page.goto("/checkout");
    const code = page.getByLabel("Discount code");

    await code.fill("nope");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("That code isn't valid.")).toBeVisible();

    // Enter applies the code; it doesn't place the order.
    await code.fill("welcome10");
    await code.press("Enter");
    await expect(page.getByTestId("checkout-discount")).toHaveText("−PKR 1,800");
    await expect(page).toHaveURL("/checkout");
    await expect(bar(page)).toContainText("PKR 17,099");
    await expect(page.getByTestId("checkout-on-delivery")).toHaveText("PKR 15,099");

    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByTestId("checkout-discount")).toBeHidden();
    await expect(bar(page)).toContainText("PKR 18,899");
  });

  test("missing details are pointed out field by field", async ({ page }) => {
    await addToCart(page, "/products/dark-brown-cropped-sheepskin-leather-jacket", "M");
    await page.goto("/checkout");
    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Enter a mobile number, like 0300 1234567.")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Mobile number")).toHaveValue("12345");
    await expect(page).toHaveURL("/checkout");
  });

  test("more than is in stock is caught before anything is placed", async ({ page }) => {
    test.skip(!placesOrders, "submits the order form");
    const path = "/products/dark-brown-cropped-sheepskin-leather-jacket";
    await addToCart(page, path, "L");
    await addSize(page);
    await expect(page.getByRole("link", { name: "Cart, 2 items" })).toBeVisible();

    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("button", { name: "Place order" }).click();
    // Next.js has its own hidden alert (the route announcer), so match ours by its words.
    const alert = page.getByRole("alert").filter({ hasText: "Not enough left of" });
    await expect(alert).toContainText("Dark Brown Cropped Sheepskin Leather Jacket, size L");
    await expect(alert.getByRole("link", { name: "Change your cart" })).toHaveAttribute("href", "/cart");
    await expect(page).toHaveURL("/checkout");
  });

  test("placing a cash on delivery order opens the order page with what to send and where", async ({ page }) => {
    test.skip(!placesOrders, "places a real order");
    await addToCart(page, "/products/black-cropped-leather-jacket", "S");
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/orders\/[A-Za-z0-9_-]{24,}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Order #\d{4,} is in\.$/);
    await expect(page.getByText("Send PKR 2,000 to confirm it.")).toBeVisible();
    await expect(page.getByText("Account number")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy account number" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 0 items" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);

    const number = (await page.getByRole("heading", { level: 1 }).textContent())?.match(/#(\d+)/)?.[1];
    const whatsapp = page.getByRole("link", { name: "Send it on WhatsApp" });
    const message = new URL((await whatsapp.getAttribute("href")) ?? "").searchParams.get("text") ?? "";
    expect(message).toContain(`#${number}`);

    // The tracking page finds it by its number and the phone it was placed with, and nothing else.
    await page.goto("/track");
    await page.getByLabel("Order number").fill(number ?? "");
    await page.getByLabel("Mobile number").fill("0300 9999999");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText(/^We couldn't find that order/)).toBeVisible();
    await page.getByLabel("Mobile number").fill("0300 1234567");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("track-status")).toHaveText("Placed. We confirm it on WhatsApp once the payment is in.");
  });

  test("a bank transfer order asks for the full amount, and the receipt uploads from the order page", async ({ page }, testInfo) => {
    test.skip(!placesOrders, "places a real order");
    await addToCart(page, "/products/black-lambskin-leather-jacket", testInfo.project.name === "iphone" ? "M" : "L");
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("radio", { name: /^Bank transfer/ }).check();
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/orders\//);
    await expect(page.getByText("Send PKR 14,999 to confirm it.")).toBeVisible();

    await page.getByLabel("Upload screenshot").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: RECEIPT });
    await expect(page.getByRole("status").filter({ hasText: "Receipt received" })).toBeAttached();
    await expect(page.getByTestId("order-lead")).toContainText("Receipt received.");
    await page.reload();
    await expect(page.getByTestId("order-lead")).toContainText("Receipt received.");
    await expect(page.getByRole("heading", { name: "Paid to" })).toBeVisible();
  });

  test("selling the last unit of a size marks it sold out on the product page straight away", async ({ page }, testInfo) => {
    test.skip(!placesOrders, "places a real order");
    // Each phone buys a different size that has one left, so the two runs don't race for it.
    const [path, size] =
      testInfo.project.name === "iphone"
        ? ["/products/black-suede-jacket", "XL"]
        : ["/products/burgundy-cropped-leather-jacket", "S"];
    // The first visit caches the page with the size still in stock.
    await addToCart(page, path, size);
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/orders\//);

    await page.goto(path);
    const sizes = page.getByRole("radiogroup", { name: "Size" });
    await expect(sizes.getByRole("radio", { name: new RegExp(`^${size}\\b`) })).toBeDisabled();
  });

  test("an order link that doesn't exist is a 404", async ({ page }) => {
    const response = await page.goto("/orders/not-a-real-order-link-at-all");
    expect(response?.status()).toBe(404);
  });
});
