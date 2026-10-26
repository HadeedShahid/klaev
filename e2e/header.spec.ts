import { expect, test } from "@playwright/test";

test.describe("header", () => {
  test("is a full-width glass bar that stays in reach", async ({ page }) => {
    await page.goto("/products/dark-brown-cropped-sheepskin-leather-jacket");
    const bar = page.locator("header").first();
    const style = await bar.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        blur: computed.backdropFilter || computed.getPropertyValue("-webkit-backdrop-filter"),
        background: computed.backgroundColor,
      };
    });
    expect(style.blur).toContain("blur");
    // Translucent white, so what scrolls beneath shows through. Browsers report it in their own colour
    // syntax (lab, oklch, rgba); whichever, the alpha is below 1.
    expect(style.background).toMatch(/(\/\s*|,\s*)0?\.\d+\)$/);

    const box = await bar.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.width).toBe(page.viewportSize()!.width);

    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect.poll(async () => (await bar.boundingBox())?.y ?? 999).toBe(0);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Shop" })).toBeVisible();
  });

  test("Shop is ink like the wordmark, so it reads over dark leather beneath the glass", async ({ page }) => {
    await page.goto("/");
    const colour = (name: string) =>
      page.locator("header").getByRole("link", { name, exact: true }).evaluate((link) => getComputedStyle(link).color);
    expect(await colour("Shop")).toBe(await colour("Klaev"));
  });

  test("visitors who ask for less transparency get a solid bar", async ({ page, browserName }) => {
    // Only Chromium can emulate the setting, through the DevTools protocol.
    test.skip(browserName !== "chromium", "Chromium only");
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    await page.goto("/");
    const style = await page.locator("header").first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return { blur: computed.backdropFilter, background: computed.backgroundColor };
    });
    expect(style.blur).toBe("none");
    expect(style.background).not.toMatch(/(\/\s*|,\s*)0?\.\d+\)$/);
  });
});
