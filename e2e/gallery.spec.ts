import { expect, test } from "@playwright/test";

const PRODUCT = "/products/dark-brown-cropped-sheepskin-leather-jacket";
const TITLE = "Dark Brown Cropped Sheepskin Leather Jacket";

test.describe("photo viewer", () => {
  test("tapping a photo opens it full screen, and the viewer swipes and closes", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.getByRole("button", { name: "View photo 1 of 12 larger" }).click();

    const viewer = page.getByRole("dialog", { name: `Photos of ${TITLE}` });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText("1 of 12")).toBeVisible();
    // The viewer opens on its title, not on the close button, so no focus ring greets a tap.
    await expect(viewer.getByRole("heading", { name: `Photos of ${TITLE}` })).toBeFocused();
    const photo = viewer.getByRole("img", { name: /photo 1 of 12$/ });
    await expect(photo).toBeVisible();
    // Full screen: the photo uses most of the viewport.
    const box = await photo.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.width).toBeGreaterThan(viewport.width * 0.8);

    // A swipe on the phone is a sideways scroll of the viewer's track.
    await viewer.getByRole("list").evaluate((track) => track.scrollTo({ left: track.clientWidth * 2 }));
    await expect(viewer.getByText("3 of 12")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    await expect(page.getByRole("button", { name: "View photo 1 of 12 larger" })).toBeFocused();
  });

  test("on a wide screen the viewer has arrows, arrow keys and thumbnails", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PRODUCT);
    await page.getByRole("button", { name: "View photo 2 of 12 larger" }).click();
    const viewer = page.getByRole("dialog", { name: `Photos of ${TITLE}` });
    await expect(viewer.getByText("2 of 12")).toBeVisible();

    await viewer.getByRole("button", { name: "Next photo" }).click();
    await expect(viewer.getByText("3 of 12")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("4 of 12")).toBeVisible();
    await viewer.getByRole("button", { name: "Show photo 1", exact: true }).click();
    await expect(viewer.getByText("1 of 12")).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Previous photo" })).toBeDisabled();

    await viewer.getByRole("button", { name: "Close photos" }).click();
    await expect(viewer).toBeHidden();
  });
});
