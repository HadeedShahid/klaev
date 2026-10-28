import { expect, test } from "@playwright/test";

// The store's own pages, at the addresses Shopify used, reachable from the footer.
test.describe("pages", () => {
  test("the footer leads to About, the size chart, contact and every policy", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const [name, path, heading] of [
      ["About Klaev", "/pages/about", "About Klaev"],
      ["Size chart", "/pages/jackets-size-chart", "Jackets size chart"],
      ["Delivery", "/policies/shipping-policy", "Delivery"],
      ["Exchanges and refunds", "/policies/refund-policy", "Exchanges and refunds"],
      ["Privacy", "/policies/privacy-policy", "Privacy policy"],
      ["Terms", "/policies/terms-of-service", "Terms of service"],
    ] as const) {
      await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", path);
      const response = await page.request.get(path);
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toContain(heading);
    }
    expect((await page.request.get("/policies/no-such-policy")).status()).toBe(404);
  });

  test("the policies state the real terms, with the current amounts", async ({ page }) => {
    await page.goto("/policies/refund-policy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Exchanges and refunds");
    await expect(page.getByText("Size exchanges within 7 days of delivery. No refunds.")).toBeVisible();
    await page.goto("/policies/shipping-policy");
    await expect(page.getByText(/Cash on delivery: PKR 900 delivery\. Send a PKR 2,000 advance/)).toBeVisible();
    await expect(page.getByRole("link", { name: "tracking page" })).toHaveAttribute("href", "/track");
  });

  test("the size chart lists every jacket line by chest", async ({ page }) => {
    await page.goto("/pages/jackets-size-chart");
    await expect(page.getByRole("heading", { name: "Cropped Leather Jackets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Black Goatskin Suede Jacket" })).toHaveAttribute("href", "/products/black-suede-jacket");
    await expect(page.getByRole("cell", { name: "38 to 40 in" }).first()).toBeVisible();
  });

  test("the contact form needs a way to reply, then thanks you", async ({ page }) => {
    await page.goto("/pages/contact");
    await page.getByLabel("Name").fill("Zara Test");
    await page.getByLabel("Message").fill("Do you make jackets in tan?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Add a mobile number or an email, so we can reply.")).toBeVisible();
    await expect(page.getByLabel("Mobile number")).toBeFocused();
    // What was typed stays.
    await expect(page.getByLabel("Message")).toHaveValue("Do you make jackets in tan?");
    await page.getByLabel("Email").fill("zara@example.com");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks, Zara. Your message is with us.");
  });
});
