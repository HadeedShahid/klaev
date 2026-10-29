import { expect, test, type Locator, type Page } from "@playwright/test";

import { addToCart } from "./helpers";

// The admin signs in with the local test password (.dev.vars.example). Against the deployed
// preview there is no such password and these tests would change real orders, so they skip.
const base = process.env.BASE_URL;
const local = !base || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
const PASSWORD = process.env.ADMIN_TEST_PASSWORD ?? "local-admin-password";

// A 1 by 1 PNG standing in for a phone screenshot of a bank transfer.
const RECEIPT = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function signIn(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

// Picks a size in a select whose options read "M, 1 in stock" or "L, 1 free": by the size, since the
// count depends on what earlier runs left.
async function chooseSize(select: Locator, size: string) {
  const value = await select.locator("option", { hasText: new RegExp(`^${size},`) }).getAttribute("value");
  await select.selectOption(value ?? "");
}

// Opens the Update status menu and picks a step.
async function step(page: Page, name: RegExp | string) {
  await page.getByRole("button", { name: "Update status" }).click();
  await page.getByRole("menuitem", { name }).click();
}

test.describe("admin", () => {
  test.skip(!local, "signs in with the local test password and changes orders");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is behind a password, and opens on the dashboard", async ({ page, request }) => {
    expect((await request.get("/admin/receipts/1")).status()).toBe(401);
    await page.goto("/admin/stock");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "That password isn't right." })).toBeVisible();
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    for (const card of ["Sales", "Orders", "Cash with the courier", "Needs action", "Recent orders", "Running low"]) {
      await expect(page.getByText(card, { exact: true }).first()).toBeVisible();
    }
    // "Profit before jacket cost" while a delivered order's cost isn't set, as in the seed.
    await expect(page.getByText(/^Profit( before jacket cost)?$/).first()).toBeVisible();
    await page.getByRole("link", { name: "7 days" }).click();
    await expect(page.getByText("Per day, last 7 days")).toBeVisible();

    await page.goto("/admin/checkouts");
    await expect(page.getByRole("heading", { name: "Abandoned checkouts", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("orders filter by payment and date, in colour, and the tabs and export keep the filters", async ({ page }) => {
    await signIn(page);
    // A change on the dashboard is green going up and red going down.
    for (const delta of await page.locator("[data-delta]").all()) {
      const text = (await delta.textContent()) ?? "";
      await expect(delta).toHaveAttribute("data-tone", text.startsWith("+") ? "green" : text.startsWith("-") ? "red" : "grey");
    }

    await page.goto("/admin/orders");
    // Every status and payment badge has its colour, and its words: colour is never the only sign.
    const badges = page.getByRole("table").locator("[data-tone]").filter({ visible: true });
    await expect(badges.first()).toBeVisible();
    for (const badge of await badges.all()) {
      await expect(badge).toHaveAttribute("data-tone", /^(green|blue|violet|amber|red|grey)$/);
      await expect(badge).not.toBeEmpty();
    }

    await page.getByRole("combobox", { name: "Payment method" }).click();
    await page.getByRole("option", { name: "Bank transfer" }).click();
    await expect(page).toHaveURL(/method=bank_transfer/);
    await page.getByRole("combobox", { name: "Placed" }).click();
    await page.getByRole("option", { name: "Last 30 days" }).click();
    await expect(page).toHaveURL(/placed=30d/);
    expect(page.url()).toContain("method=bank_transfer");
    for (const row of await page.getByRole("table").getByRole("row").filter({ has: page.getByRole("link") }).all()) {
      await expect(row).toContainText("Bank transfer");
    }

    // Moving between tabs keeps the filters, and so does the export.
    await page.getByRole("navigation", { name: "Order status" }).getByRole("link", { name: /^To ship/ }).click();
    await expect(page).toHaveURL(/tab=to_ship/);
    expect(page.url()).toContain("method=bank_transfer");
    const exported = await page.getByRole("button", { name: "Export" }).getAttribute("href");
    expect(exported).toContain("method=bank_transfer");
    const csv = await (await page.request.get(exported!)).text();
    for (const line of csv.trim().split("\n").slice(1)) expect(line).toContain("Bank transfer");

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/tab=to_ship$/);

    // A stretch with nothing in it says so, and offers the way back.
    await page.goto("/admin/orders?placed=custom&from=2020-01-01&to=2020-01-02");
    await expect(page.getByText("No orders match these filters.")).toBeVisible();
    await expect(page.getByLabel("From")).toHaveValue("2020-01-01");
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
  });

  test("a message from the contact form waits in Messages until it's handled", async ({ page }, testInfo) => {
    const name = `Contact ${testInfo.project.name} ${Date.now().toString(36)}`;
    await page.goto("/pages/contact");
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Mobile number").fill("0321 9998887");
    await page.locator("label").filter({ hasText: "A custom jacket" }).click();
    await page.getByLabel("Message").fill("A tan cropped jacket, please.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Your message is with us.");

    await signIn(page);
    await page.getByRole("link", { name: "Messages" }).click();
    const message = page.locator("[data-testid^=message-]").filter({ hasText: name });
    await expect(message).toContainText("A custom jacket");
    await expect(message.getByRole("link", { name: /^WhatsApp/ })).toHaveAttribute("href", /wa\.me\/923219998887/);
    await message.getByRole("button", { name: "Mark handled" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mark handled" }).click();
    await expect(message).toBeHidden();
    await page.getByRole("link", { name: "Handled" }).click();
    await expect(page.locator("[data-testid^=message-]").filter({ hasText: name })).toBeVisible();
  });

  test("an edited policy shows on the store until put back", async ({ page }, testInfo) => {
    // Pages are one set for the whole store, so only one phone edits one.
    test.skip(testInfo.project.name !== "iphone", "one phone edits the shared page");
    await signIn(page);
    await page.goto("/admin/content/pages");
    await page.getByRole("link", { name: "About Klaev" }).click();
    await page.getByLabel("Page", { exact: true }).fill("We make jackets.\n\n## Visit\nSee the [size chart](/pages/jackets-size-chart).");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await page.goto("/pages/about");
    await expect(page.getByRole("heading", { name: "Visit", level: 2 })).toBeVisible();
    await expect(page.getByRole("link", { name: "size chart", exact: true })).toHaveAttribute("href", "/pages/jackets-size-chart");

    await page.goto("/admin/content/pages");
    await page.getByRole("link", { name: "About Klaev" }).click();
    await page.getByRole("button", { name: "Put back the original" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Put it back" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Put back the original" })).toBeHidden();
    await page.goto("/pages/about");
    await expect(page.getByRole("heading", { name: "Where it comes from", level: 2 })).toBeVisible();
  });

  test("a visit from a tagged Instagram link shows in the live view, the overview and the funnel", async ({ page }, testInfo) => {
    const campaign = `e2e-${testInfo.project.name}-${Date.now().toString(36)}`;
    await page.goto(`/?utm_source=instagram&utm_campaign=${campaign}`);
    await expect.poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === "klaev_sid")).toBe(true);
    await page.goto("/pages/jackets-size-chart");
    // The tracker sends each page as it shows; give the last one a moment to land.
    await page.waitForTimeout(500);

    await signIn(page);
    await page.goto("/admin/analytics/live");
    await expect(page.getByRole("link", { name: "/pages/jackets-size-chart" }).first()).toBeVisible();
    await page.goto("/admin/analytics?days=7");
    await expect(page.getByText(campaign)).toBeVisible();
    await expect(page.getByRole("cell", { name: "Instagram" })).toBeVisible();
    await page.goto("/admin/analytics/funnel?days=7");
    await expect(page.getByText("Visited the store")).toBeVisible();
    await page.goto("/admin/analytics/reports?tab=behaviour&days=7");
    await expect(page.getByText("Landing pages", { exact: true })).toBeVisible();
    const csv = await page.request.get("/admin/export/report?tab=sales&table=by-product&days=30");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Product");
  });

  test("the admin follows the computer's dark setting, a choice of light sticks, and the store stays light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const dark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
    await signIn(page);
    expect(await dark()).toBe(true);

    await page.getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    expect(await dark()).toBe(false);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    expect(await dark()).toBe(false);

    await page.getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("menuitemradio", { name: "Match this computer" }).click();
    expect(await dark()).toBe(true);

    await page.goto("/");
    expect(await dark()).toBe(false);
  });

  // Burgundy's and the suede's M and L are sold out in the seed and no other test looks at them; each
  // phone restocks its own jacket's two sizes.
  test("an order taken on WhatsApp: change its size, ship it, exchange it, and take the old one back", async ({ page }, testInfo) => {
    test.slow();
    const iphone = testInfo.project.name === "iphone";
    const title = iphone ? "Burgundy Cropped Sheepskin Leather Jacket" : "Black Goatskin Suede Jacket";
    const price = iphone ? "PKR 17,999" : "PKR 18,999";
    await signIn(page);

    await page.goto("/admin/inventory");
    for (const size of ["M", "L"]) {
      const row = page
        .getByRole("row")
        .filter({ hasText: title })
        .filter({ has: page.getByRole("cell", { name: size, exact: true }) });
      await row.getByRole("button", { name: "Restock" }).click();
      const restock = page.getByRole("dialog", { name: `Restock ${title}, size ${size}` });
      await restock.getByLabel("How many came in").fill("1");
      await restock.getByRole("button", { name: "Restock" }).click();
      await expect(restock).toBeHidden();
    }

    // Sold on WhatsApp at an agreed price, the advance already in.
    await page.goto("/admin/orders");
    await page.getByRole("link", { name: "Create order" }).last().click();
    await page.getByLabel("Add a jacket or belt").selectOption({ label: `${title}, ${price}` });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await chooseSize(page.getByLabel("Size"), "M");
    await page.getByLabel("Price each, PKR").fill("16500");
    await page.getByLabel("Name", { exact: true }).fill("Hira Shah");
    await page.getByLabel("Mobile number").fill(iphone ? "0321 5550101" : "0321 5550102");
    await page.getByLabel("City").fill("Lahore");
    await page.getByLabel("Address").fill("House 3, Street 9");
    await page.getByLabel("The advance is in").check();
    await page.getByRole("button", { name: "Create order" }).click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+$/);
    const number = page.url().match(/(\d+)$/)?.[1];
    const header = page.locator("header").filter({ hasText: `#${number}` });
    await expect(header.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByText("PKR 17,400").first()).toBeVisible();

    // They'd rather have L.
    await page.getByRole("button", { name: "Edit items" }).click();
    const items = page.getByRole("dialog", { name: `Items in #${number}` });
    await chooseSize(items.getByLabel("Size"), "L");
    await items.getByRole("button", { name: "Save items" }).click();
    await expect(items).toBeHidden();
    await expect(page.getByText("Size L", { exact: true })).toBeVisible();

    const slip = await page.request.get(`/admin/print/${number}?doc=slip`);
    expect(await slip.text()).toContain("Packing slip");
    await step(page, "Mark packed");
    await step(page, /^Mark shipped/);
    const ship = page.getByRole("dialog", { name: `Ship #${number}` });
    await ship.getByLabel("Tracking number").fill(`PX-${number}`);
    await ship.getByRole("button", { name: "Mark shipped" }).click();
    await expect(header.getByText("Booked", { exact: true })).toBeVisible();
    await step(page, /^Mark delivered/);
    await expect(header.getByText("Delivered", { exact: true })).toBeVisible();

    // L didn't fit after all: M goes out as an exchange, and the L comes back into stock.
    await page.getByRole("button", { name: "Exchange a size" }).click();
    const exchange = page.getByRole("dialog", { name: `Exchange a size from #${number}` });
    await chooseSize(exchange.getByLabel("New size"), "M");
    await exchange.getByRole("button", { name: "Send the new size" }).click();
    await expect(page.getByRole("link", { name: `#${number}`, exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(new RegExp(`/admin/orders/${number}$`));
    await expect(page.getByText("The old jacket isn't back yet.")).toBeVisible();
    await page.getByRole("button", { name: "It's back" }).click();
    await page.getByRole("dialog", { name: "Is the old jacket back?" }).getByRole("button", { name: "Yes, back in stock" }).click();
    await expect(page.getByText(/^The old jacket was back in stock on/)).toBeVisible();

    const csv = await (await page.request.get("/admin/export/orders")).text();
    expect(csv).toContain(`"${number}"`);
  });

  // Oxblood's M and L are sold out and no other test looks at them; each phone restocks its own.
  test("restock a size, sell it, and take the order from receipt to the courier's payout", async ({ page }, testInfo) => {
    // A whole order's life and its customer: longer than one page's test.
    test.slow();
    const size = testInfo.project.name === "iphone" ? "M" : "L";
    const title = "Oxblood Lambskin Leather Jacket";
    await signIn(page);

    // Stock: one more of this size came in.
    await page.getByRole("link", { name: "Products", exact: true }).click();
    await page.getByRole("link", { name: "Inventory", exact: true }).click();
    const stockRow = page
      .getByRole("row")
      .filter({ hasText: title })
      .filter({ has: page.getByRole("cell", { name: size, exact: true }) });
    await expect(stockRow).toContainText("Sold out");
    await stockRow.getByRole("button", { name: "Restock" }).click();
    const restock = page.getByRole("dialog", { name: `Restock ${title}, size ${size}` });
    await restock.getByLabel("How many came in").fill("1");
    await restock.getByRole("button", { name: "Restock" }).click();
    await expect(restock).toBeHidden();
    await expect(stockRow).not.toContainText("Sold out");

    // The shop sells it straight away; the customer orders it and sends the advance.
    await page.goto("/products/oxblood-lambskin-leather-jacket");
    await addToCart(page, size);
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("Sara Malik");
    await page.getByLabel("Mobile number").fill("0345 1234567");
    await page.getByLabel("Email").fill(`sara-${testInfo.project.name}@example.com`);
    await page.getByLabel("City").fill("Karachi");
    await page.getByLabel("Full address").fill("Flat 4, Block 7, Clifton");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/orders\//);
    const number = (await page.getByRole("heading", { level: 1 }).textContent())?.match(/#(\d+)/)?.[1];
    expect(number).toBeTruthy();
    await page.getByLabel("Upload screenshot").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: RECEIPT });
    await expect(page.getByTestId("order-lead")).toContainText("Receipt received.");

    // To confirm: the row flags the receipt; the order shows it beside what it should show.
    // Found by number: the local database keeps orders from earlier runs, so the queue runs to pages.
    await page.goto(`/admin/orders?tab=to_confirm&q=${number}`);
    const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: `#${number}`, exact: true }) });
    await expect(row).toContainText("Receipt in");
    await row.getByRole("link", { name: `#${number}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/orders/${number}$`));
    const header = page.locator("header").filter({ hasText: `#${number}` });
    await expect(page.getByRole("img", { name: /^Receipt uploaded/ })).toBeVisible();
    await expect(page.getByText("It should show PKR 2,000.")).toBeVisible();
    expect(await page.getByRole("link", { name: "WhatsApp Sara" }).getAttribute("href")).toContain("wa.me/923451234567");
    await expect(page.getByText("03451234567").first()).toBeVisible();
    await step(page, "Confirm, PKR 2,000 received");
    await expect(header.getByText("Confirmed", { exact: true })).toBeVisible();

    // Ship: the tracking number, and the courier's charge from the default.
    await step(page, /^Mark shipped/);
    const ship = page.getByRole("dialog", { name: `Ship #${number}` });
    await expect(ship.getByLabel("Courier charge")).toHaveValue("590");
    await ship.getByLabel("Tracking number").fill(`PX-${number}`);
    await ship.getByRole("button", { name: "Mark shipped" }).click();
    await expect(header.getByText("Booked", { exact: true })).toBeVisible();

    // The courier's tracking says it's out for delivery; the customer's tracking page says so too.
    await step(page, "Out for delivery");
    await expect(header.getByText("Out for delivery", { exact: true })).toBeVisible();

    // Delivered: the rider's PKR 13,899 is with the courier until it pays out, less 4% (PKR 556).
    await step(page, "Mark delivered, PKR 13,899 collected");
    await expect(header.getByText("With courier", { exact: true })).toBeVisible();
    await step(page, /^Record the courier's payout/);
    const payout = page.getByRole("dialog", { name: `Courier payout for #${number}` });
    await expect(payout.getByLabel("Amount paid out")).toHaveValue("13343");
    await expect(payout.getByText("The courier kept PKR 556, recorded as tax.")).toBeVisible();
    await payout.getByRole("button", { name: "Record payout" }).click();
    await expect(header.getByText("Paid", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Payments" }).click();
    await expect(page.getByText("Kept by the courier as tax", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page.getByText(`Shipped, tracking PX-${number}`)).toBeVisible();
    await expect(page.getByText("Courier paid out, PKR 556 kept as tax")).toBeVisible();

    // The customer: every order they placed, and a note for next time. Both phones order as Sara,
    // so she may already have the other phone's order.
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.getByRole("link", { name: /^(First order|\d+ other orders?)$/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sara Malik");
    await expect(page.getByRole("link", { name: `#${number}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).nth(1).click();
    const notes = page.getByRole("dialog", { name: "Notes on Sara Malik" });
    await notes.getByLabel("Note").fill("Prefers evening calls.");
    await notes.getByRole("button", { name: "Save" }).click();
    await expect(notes).toBeHidden();
    await expect(page.getByText("Prefers evening calls.")).toBeVisible();

    await page.getByRole("link", { name: "Customers", exact: true }).first().click();
    await page.getByLabel("Find a customer").fill("0345 1234567");
    await page.getByLabel("Find a customer").press("Enter");
    await expect(page.getByRole("link", { name: "Sara Malik" }).first()).toBeVisible();
  });

  test("write a journal article, publish it, read it on the store, then delete it", async ({ page }, testInfo) => {
    const title = `Caring for lambskin ${testInfo.project.name} ${Date.now().toString(36)}`;
    await signIn(page);
    await page.goto("/admin/content/journal");
    await page.getByRole("button", { name: "New article" }).click();
    const create = page.getByRole("dialog", { name: "A new article" });
    await create.getByLabel("Title").fill(title);
    await create.getByRole("button", { name: "Start writing" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/journal\/\d+$/);

    await page.getByLabel("Summary").fill("Three habits that keep it soft.");
    await page.getByLabel("Article").fill("Lambskin likes air.\n\n## Three habits\n- Hang it on a wide hanger.\n- Keep it dry.");
    await page.getByLabel("Status").selectOption("published");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    const handle = await page.getByLabel("Address").inputValue();

    await page.goto("/blogs/blog");
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await expect(page).toHaveURL(`/blogs/blog/${handle}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("heading", { name: "Three habits", level: 2 })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Hang it on a wide hanger." })).toBeVisible();

    await page.goBack();
    await page.goto("/admin/content/journal");
    await page.getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Delete article" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete it" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/journal$/);
    expect((await page.request.get(`/blogs/blog/${handle}`)).status()).toBe(404);
  });

  test("a question added to the FAQ shows on the home page", async ({ page }, testInfo) => {
    // The FAQ is one list for the whole store, so only one phone edits it.
    test.skip(testInfo.project.name !== "iphone", "one phone edits the shared FAQ");
    await signIn(page);
    await page.goto("/admin/content/faq");
    await page.getByRole("button", { name: "Add a question" }).click();
    await page.getByPlaceholder("The question").last().fill("Do you deliver to Gilgit?");
    await page.getByPlaceholder("The answer").last().fill("Yes. Cash on delivery adds {cod_fee} delivery there too.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

    await page.goto("/");
    await page.getByText("Do you deliver to Gilgit?").click();
    await expect(page.getByText("Yes. Cash on delivery adds PKR 900 delivery there too.")).toBeVisible();

    // Back as it was.
    await page.goto("/admin/content/faq");
    await page.getByRole("button", { name: "Remove this question" }).last().click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  });

  test("settings show the checkout terms and the bank account, and save them", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByLabel("Cash on delivery fee, PKR")).toHaveValue("900");
    await expect(page.getByLabel("Advance to confirm, PKR")).toHaveValue("2000");
    await expect(page.getByLabel("Account number")).toHaveValue("00001234567890");
    await page.getByLabel("Advance to confirm, PKR").fill("2,000");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "The store shows the new amounts now." })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "The current password isn't right." })).toBeVisible();
  });

  test("create a discount code, turn it off so checkout stops taking it, then remove it", async ({ page }, testInfo) => {
    test.slow();
    // The database keeps codes between runs, so each run makes its own.
    const code = `E2E${testInfo.project.name.toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    await signIn(page);
    await page.getByRole("link", { name: "Discounts" }).click();
    await page.getByRole("button", { name: "Create code" }).click();
    const create = page.getByRole("dialog", { name: "Create a discount code" });
    await create.getByLabel("Code").fill(code.toLowerCase());
    await create.getByLabel("Takes off").selectOption("fixed");
    await create.getByLabel("Amount, PKR").fill("1,500");
    await create.getByLabel("Minimum order, PKR").fill("10000");
    await create.getByLabel("Once per customer").check();
    await create.getByRole("button", { name: "Create code" }).click();
    await expect(create).toBeHidden();

    const row = page.getByTestId(`discount-${code}`);
    await expect(row).toContainText("PKR 1,500 off, orders of PKR 10,000 or more, once per customer");
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    // Checkout takes it while it's on, and not once it's off.
    await page.goto("/products/dark-brown-cropped-sheepskin-leather-jacket");
    await addToCart(page, "M");
    await page.goto("/checkout");
    await page.getByLabel("Discount code").fill(code);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("checkout-discount")).toHaveText("−PKR 1,500");

    await page.goto("/admin/discounts");
    await row.getByRole("button", { name: `Actions for ${code}` }).click();
    await page.getByRole("menuitem", { name: "Turn off" }).click();
    await expect(row.getByText("Off", { exact: true })).toBeVisible();
    await page.goto("/checkout");
    await page.getByLabel("Discount code").fill(code);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("That code isn't valid.")).toBeVisible();

    // No order used it, so it can go.
    await page.goto("/admin/discounts");
    await row.getByRole("button", { name: `Actions for ${code}` }).click();
    await page.getByRole("menuitem", { name: "Remove…" }).click();
    await page.getByRole("dialog", { name: `Remove ${code}?` }).getByRole("button", { name: "Remove it" }).click();
    await expect(row).toBeHidden();
  });
});
