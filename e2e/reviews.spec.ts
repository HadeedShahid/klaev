import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

// Reviews belong to delivered orders, so these tests sell, ship and deliver one first, from the
// admin. They sign in with the local test password and change orders, so they skip against any
// deployed preview, like the admin tests.
const base = process.env.BASE_URL;
const local = !base || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
const PASSWORD = process.env.ADMIN_TEST_PASSWORD ?? "local-admin-password";
// A small grey image standing in for a screenshot of their message, wide so its copies stay small.
const screenshot = () => sharp({ create: { width: 48, height: 12, channels: 3, background: "#e5e5e5" } }).png().toBuffer();

async function signIn(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

async function chooseSize(select: Locator, size: string) {
  const value = await select.locator("option", { hasText: new RegExp(`^${size},`) }).getAttribute("value");
  await select.selectOption(value ?? "");
}

async function step(page: Page, name: RegExp | string) {
  await page.getByRole("button", { name: "Update status" }).click();
  await page.getByRole("menuitem", { name }).click();
}

// One unit of a size nothing else checks comes in, sells on WhatsApp, ships and arrives. Returns the
// order's number, with its admin page open.
async function deliveredOrder(page: Page, { title, price, size, name, phone }: { title: string; price: string; size: string; name: string; phone: string }) {
  await page.goto("/admin/inventory");
  const row = page.getByRole("row").filter({ hasText: title }).filter({ has: page.getByRole("cell", { name: size, exact: true }) });
  await row.getByRole("button", { name: "Restock" }).click();
  const restock = page.getByRole("dialog", { name: `Restock ${title}, size ${size}` });
  await restock.getByLabel("How many came in").fill("1");
  await restock.getByRole("button", { name: "Restock" }).click();
  await expect(restock).toBeHidden();

  await page.goto("/admin/orders/new");
  await page.getByLabel("Add a jacket or belt").selectOption({ label: `${title}, ${price}` });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await chooseSize(page.getByLabel("Size"), size);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("City").fill("Karachi");
  await page.getByLabel("Address").fill("Flat 4, Block 7");
  await page.getByLabel("The advance is in").check();
  await page.getByRole("button", { name: "Create order" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/\d+$/);
  const number = page.url().match(/(\d+)$/)![1];
  const header = page.locator("header").filter({ hasText: `#${number}` });

  await step(page, "Mark packed");
  await step(page, /^Mark shipped/);
  const ship = page.getByRole("dialog", { name: `Ship #${number}` });
  await ship.getByLabel("Tracking number").fill(`PX-${number}`);
  await ship.getByRole("button", { name: "Mark shipped" }).click();
  await expect(header.getByText("Booked", { exact: true })).toBeVisible();
  await step(page, /^Mark delivered/);
  await expect(header.getByText("Delivered", { exact: true })).toBeVisible();
  return number;
}

test.describe("reviews", () => {
  test.skip(!local, "signs in with the local test password and changes orders");

  // Black cropped M and L are sold out in the seed and no other test buys them; each phone restocks its own.
  test("a buyer reviews a delivered order through its link; once published it shows on the product page", async ({ page }, testInfo) => {
    test.slow();
    const iphone = testInfo.project.name === "iphone";
    const first = iphone ? "Zara" : "Bilal";
    // Unique per run: the database keeps reviews from earlier runs and retries.
    const words = `Soft leather, sits right at the waist. ${testInfo.project.name} w${testInfo.workerIndex} ${Date.now().toString(36)}`;
    await signIn(page);
    await deliveredOrder(page, {
      title: "Black Cropped Sheepskin Leather Jacket",
      price: "PKR 17,999",
      size: iphone ? "M" : "L",
      name: `${first} Ahmed`,
      phone: iphone ? "0321 5550201" : "0321 5550202",
    });

    // The WhatsApp message now asks for a review, with the order's own review link.
    const ask = page.getByRole("link", { name: `Ask ${first} for a review` });
    const message = new URL((await ask.getAttribute("href"))!).searchParams.get("text")!;
    expect(message).toContain(`Assalam o Alaikum ${first}, hope the jacket is fitting well.`);
    const link = new URL(message.match(/https?:\/\/\S+\/review/)![0]);

    // The buyer opens it.
    await page.goto(link.pathname);
    await expect(page.getByRole("heading", { name: "How is it?", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Send review" }).click();
    await expect(page.getByText("Choose a rating, from one to five stars.")).toBeVisible();
    // Tapped as a person would: the star, not the hidden radio under it.
    const five = page.getByRole("radio", { name: "5 stars" });
    await page.locator("label").filter({ has: five }).click();
    await expect(five).toBeChecked();
    await page.getByLabel("Your review").fill(words);
    await expect(page.getByLabel("Name shown")).toHaveValue(`${first} A.`);
    await expect(page.getByText("With your city, Karachi.")).toBeVisible();
    await page.getByRole("button", { name: "Send review" }).click();
    await expect(page.getByText("Thank you.")).toBeVisible();

    // Their order page no longer asks.
    await page.goto(link.pathname.replace(/\/review$/, ""));
    await expect(page.getByRole("heading", { name: /is in\.$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /How is it\?/ })).toHaveCount(0);

    // It waits in the admin until published.
    await page.goto("/admin/reviews");
    const card = page.locator("[data-testid^='review-']").filter({ hasText: words });
    await expect(card).toContainText(`${first} A., Karachi`);
    await card.getByRole("button", { name: "Publish" }).click();
    await expect(card).toHaveCount(0);

    await page.goto("/products/black-cropped-leather-jacket");
    const section = page.getByRole("region", { name: "In their words" });
    await expect(section.getByText(words)).toBeAttached();
    await expect(section.getByText(/from \d+ verified buyers?/)).toBeVisible();
    await expect(page.getByRole("link", { name: /\d+ reviews?$/ })).toHaveAttribute("href", "#reviews");
    const data = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(data.join("")).toContain('"aggregateRating"');
  });

  // Black lambskin XL and burgundy XL are sold out in the seed and no other test buys them.
  test("a review sent on WhatsApp is typed in, goes live at once, and can be put on the home page", async ({ page }, testInfo) => {
    test.slow();
    const iphone = testInfo.project.name === "iphone";
    const title = iphone ? "Black Lambskin Leather Jacket" : "Burgundy Cropped Sheepskin Leather Jacket";
    const handle = iphone ? "black-lambskin-leather-jacket" : "burgundy-cropped-leather-jacket";
    const words = `Bohat zabardast jacket hai. ${testInfo.project.name} w${testInfo.workerIndex} ${Date.now().toString(36)}`;
    await signIn(page);
    const number = await deliveredOrder(page, {
      title,
      price: iphone ? "PKR 14,999" : "PKR 17,999",
      size: "XL",
      name: iphone ? "Hamza Raza" : "Usman Tariq",
      phone: iphone ? "0321 5550203" : "0321 5550204",
    });

    await page.getByRole("link", { name: "Add their review" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/reviews/new\\?order=${number}$`));
    await page.getByLabel("Words").fill(words);
    await page.getByRole("button", { name: "Add review" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "agreed to it being on the store" })).toBeVisible();
    await page.getByLabel("They agreed to it being on the store.").check();
    await page.getByRole("button", { name: "Add review" }).click();

    await expect(page).toHaveURL(/\/admin\/reviews\?tab=live/);
    const card = page.locator("[data-testid^='review-']").filter({ hasText: words });
    await expect(card.getByText("WhatsApp", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "Show on the home page" }).click();
    await expect(card.getByText("On the home page", { exact: true })).toBeVisible();

    // The store doesn't say where the words came from; it shows the message itself, once there's a screenshot.
    await page.goto(`/products/${handle}`);
    const section = page.getByRole("region", { name: "In their words" });
    const review = section.locator("[data-testid='review']").filter({ hasText: words });
    await expect(review).toBeVisible();
    await expect(review).not.toContainText("Sent on");
    await expect(review.getByRole("button", { name: "See the message" })).toHaveCount(0);

    await page.goto("/admin/reviews?tab=live");
    await card.getByLabel("Add the message's screenshot").setInputFiles({ name: "message.png", mimeType: "image/png", buffer: await screenshot() });
    await expect(card.getByText("Remove screenshot")).toBeVisible();

    await page.goto(`/products/${handle}`);
    await expect(review).not.toContainText("Sent on");
    await review.getByRole("button", { name: "See the message" }).click();
    await expect(page.getByRole("dialog").getByRole("img", { name: /'s message$/ })).toBeVisible();
  });
});
