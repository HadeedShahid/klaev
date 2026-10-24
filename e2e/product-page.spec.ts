import { expect, test } from "@playwright/test";

const CROPPED = "/products/dark-brown-cropped-sheepskin-leather-jacket";
const LAMBSKIN = "/products/black-lambskin-leather-jacket";

test.describe("product page", () => {
  test("shows the name, price and every photo", async ({ page }) => {
    await page.goto(CROPPED);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Dark Brown Cropped Sheepskin Leather Jacket",
    );
    await expect(page.getByTestId("product-price").filter({ visible: true })).toHaveText("PKR 17,999");
    await expect(page.getByRole("img", { name: /photo \d+ of 12$/ })).toHaveCount(12);
  });

  test("sizes name their measurements, and sold-out sizes stay visible but can't be chosen", async ({
    page,
  }) => {
    await page.goto(CROPPED);
    const sizes = page.getByRole("radiogroup", { name: "Size" });

    await expect(sizes.getByRole("radio", { name: /^M\b/ })).toBeEnabled();
    await expect(sizes.getByText("Jacket chest 43 in")).toBeVisible();

    const soldOut = sizes.getByRole("radio", { name: /^XL\b/ });
    await expect(soldOut).toBeDisabled();
    await expect(sizes.getByText("Sold out")).toBeVisible();
  });

  test("body-measured jackets give the chest range each size fits", async ({ page }) => {
    await page.goto(LAMBSKIN);
    const sizes = page.getByRole("radiogroup", { name: "Size" });
    await expect(sizes.getByText("Fits chest 38 to 40 in")).toBeVisible();
  });

  test("the size guide opens a measurement table", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByText("Size guide").click();
    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader", { name: "Jacket chest" })).toBeVisible();
    await expect(table.getByRole("row", { name: /^M 43 in 23 in$/ })).toBeVisible();
  });

  test("spells out what cash on delivery and bank transfer each cost", async ({ page }) => {
    await page.goto(CROPPED);
    const payment = page.getByRole("region", { name: "How you pay" });

    const cod = payment.getByTestId("pay-cod").filter({ visible: true });
    await expect(cod).toContainText("Cash on delivery");
    await expect(cod).toContainText("PKR 2,000");
    await expect(cod).toContainText("PKR 16,899");
    await expect(cod).toContainText("PKR 900");

    const bank = payment.getByTestId("pay-bank").filter({ visible: true });
    await expect(bank).toContainText("Bank transfer");
    await expect(bank).toContainText("PKR 17,999");
    await expect(bank).toContainText("Free delivery");
  });

  test("states the exchange policy and offers WhatsApp help", async ({ page }) => {
    await page.goto(CROPPED);
    await expect(page.getByText("Size exchanges within 7 days of delivery")).toBeVisible();
    await expect(page.getByText("No refunds.").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /WhatsApp/ }).first()).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/923231483650/,
    );
  });

  test("the buy button asks for a size first, then names it", async ({ page }) => {
    await page.goto(CROPPED);
    const buy = page.getByTestId("buy-button").filter({ visible: true });

    await expect(buy).toHaveText("Choose a size");
    await buy.click();
    await expect(page).toHaveURL(CROPPED);
    await expect(page.getByRole("radiogroup", { name: "Size" })).toBeInViewport();

    await page.getByRole("radio", { name: /^M\b/ }).check();
    await expect(buy).toHaveText("Add to cart, size M");
  });

  test("the buy bar says what to send now and keeps its height when a size is chosen", async ({ page }) => {
    await page.goto("/products/oxblood-lambskin-leather-jacket");
    const bar = page.getByTestId("buy-bar").filter({ visible: true });
    await expect(bar).toContainText("PKR 2,000 to confirm");
    const before = await bar.boundingBox();

    await page.getByRole("radio", { name: /^XL\b/ }).check();
    await expect(page.getByTestId("buy-button").filter({ visible: true })).toHaveText("Add to cart, size XL");
    const after = await bar.boundingBox();
    expect(after?.height).toBe(before?.height);
  });

  test("adds a sized jacket to the cart", async ({ page }) => {
    await page.goto(CROPPED);
    await page.getByRole("radio", { name: /^M\b/ }).check();
    await page.getByTestId("buy-button").filter({ visible: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "Added to cart" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
  });

  // Browsers get the streamed shell, so the 404 is marked noindex rather than sent as a status.
  // Crawlers render without streaming and get a real 404 (checked against a production build).
  test("an unknown product shows a not found page that search engines skip", async ({ page }) => {
    await page.goto("/products/not-a-real-product");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't here");
    await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("link", { name: "See all products" })).toHaveAttribute("href", "/");
  });
});
