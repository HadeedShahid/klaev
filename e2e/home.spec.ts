import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

const CROPPED = [
  { title: "Black Cropped Sheepskin Leather Jacket", href: "/products/black-cropped-leather-jacket" },
  { title: "Dark Brown Cropped Sheepskin Leather Jacket", href: "/products/dark-brown-cropped-sheepskin-leather-jacket" },
  { title: "Burgundy Cropped Sheepskin Leather Jacket", href: "/products/burgundy-cropped-leather-jacket" },
];

test.describe("landing page", () => {
  test("opens on the cropped jackets with the price and a way to shop them", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cropped leather jackets.");
    await expect(page.getByTestId("hero-price").filter({ visible: true })).toHaveText("PKR 17,999");
    await expect(page.getByRole("link", { name: "Shop cropped" })).toHaveAttribute(
      "href",
      "/collections/cropped-leather-jackets",
    );
    await expect(page.getByRole("link", { name: "See the colours" })).toHaveAttribute("href", "#colours");
    await expect(page.getByRole("img", { name: /cropped leather jacket/i }).first()).toBeVisible();
  });

  test("lets a shopper tap any of the three colours right under the hero", async ({ page }) => {
    await page.goto("/");
    const colours = page.getByRole("region", { name: "Three colours" });
    for (const jacket of CROPPED) {
      await expect(colours.getByRole("link", { name: new RegExp(jacket.title) })).toHaveAttribute("href", jacket.href);
    }
  });

  test("tapping a colour opens that jacket", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Three colours" }).getByRole("link", { name: /Dark Brown/ }).click();
    await page.waitForURL("**/products/dark-brown-cropped-sheepskin-leather-jacket");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dark Brown Cropped Sheepskin Leather Jacket");
  });

  test("answers the four doubts, one section each", async ({ page }) => {
    await page.goto("/");
    for (const heading of ["Cut to the waist.", "Real leather, up close.", "Sized by chest.", "How you pay."]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByRole("row", { name: /^M 43 in$/ })).toBeVisible();
  });

  test("shows exactly what a cropped jacket costs each way to pay", async ({ page }) => {
    await page.goto("/");
    const pay = page.getByRole("region", { name: "How you pay." });
    const cod = pay.getByTestId("pay-cod");
    await expect(cod).toContainText("PKR 2,000");
    await expect(cod).toContainText("PKR 16,899");
    await expect(cod).toContainText("PKR 18,899");
    await expect(pay.getByTestId("pay-bank")).toContainText("PKR 17,999");
    await expect(pay.getByText(/Size exchanges within 7 days of delivery/)).toBeVisible();
  });

  test("points to the other jackets and to made-to-order", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Shop lambskin" })).toHaveAttribute("href", "/collections/leather-jackets");
    await expect(page.getByRole("link", { name: "Shop suede" })).toHaveAttribute("href", "/products/black-suede-jacket");
    await expect(page.getByRole("link", { name: "Design yours on WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/923231483650/,
    );
  });

  test("the FAQ states the real payment and exchange terms", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Do you offer Cash on Delivery?").click();
    await expect(page.getByText(/send a PKR 2,000 advance/i)).toBeVisible();
    await page.getByText("What if it does not fit?").click();
    await expect(page.getByText(/No refunds\./).filter({ visible: true }).first()).toBeVisible();
  });

  test("shows no belts while they are hidden", async ({ page }) => {
    await page.goto("/");
    expect(await page.locator("main").innerText()).not.toMatch(/belt/i);
  });

  test("the headline and price are in the static shell", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cropped leather jackets.");
        await expect(page.getByTestId("hero-price").filter({ visible: true })).toHaveText("PKR 17,999");
      },
      { baseURL },
    );
  });
});
