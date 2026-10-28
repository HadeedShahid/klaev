// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { PAGE_DEFAULTS } from "@/data/pages";

import { createTestDb } from "./db/test-db";
import { inlineParts, plainText } from "./journal-body";
import { listMessages, sendMessage, setHandled, waitingMessages } from "./messages";
import { getPage, listPages, restorePage, savePage } from "./pages";
import { fillTerms, TERM_PLACEHOLDERS } from "./store-terms";

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
}, 60_000);
afterAll(() => store?.dispose());

describe("store pages", () => {
  test("every page starts from its text, keeps the brand rules, and uses only known placeholders", () => {
    for (const page of PAGE_DEFAULTS) {
      for (const text of [page.title, page.description, page.body]) {
        expect(text, page.handle).not.toMatch(/[–—]/);
        // PKR only, and none of Shopify's template promises.
        expect(text, page.handle).not.toMatch(/\bRs\.?\s?\d|\$|\bUSD\b|30-day|full refund/i);
        for (const placeholder of text.match(/\{[a-z_]+\}/g) ?? []) expect(TERM_PLACEHOLDERS, page.handle).toContain(placeholder);
      }
    }
    const filled = fillTerms("Send {advance}, delivery {cod_fee}, within {exchange_days} days, in {delivery_days} days.", { codAdvance: 2000, codDeliveryFee: 900 });
    expect(filled).toBe("Send PKR 2,000, delivery PKR 900, within 7 days, in 2 to 5 days.");
  });

  test("links are words with a site, web or mail target; anything else stays text", () => {
    expect(inlineParts("Ask on [WhatsApp](https://wa.me/923231483650) or [here](/pages/contact).")).toEqual([
      { text: "Ask on " },
      { text: "WhatsApp", href: "https://wa.me/923231483650" },
      { text: " or " },
      { text: "here", href: "/pages/contact" },
      { text: "." },
    ]);
    expect(inlineParts("[bad](javascript:alert(1)) and [away](//example.com)")).toEqual([{ text: "[bad](javascript:alert(1)) and [away](//example.com)" }]);
    expect(plainText("See [the chart](/pages/jackets-size-chart).")).toBe("See the chart.");
  });

  test("an edited page shows its edit until restored; unknown pages don't exist", async () => {
    expect(await getPage("about", store.db)).toMatchObject({ title: "About Klaev", edited: false });
    expect(await getPage("nope", store.db)).toBeNull();
    expect(await savePage(store.db, "about", { title: "About us", description: "Short.", body: "One line — with a dash." })).toMatchObject({ ok: false });
    expect(await savePage(store.db, "about", { title: "About us", description: "Short.", body: "One line." })).toEqual({ ok: true });
    expect(await getPage("about", store.db)).toMatchObject({ title: "About us", body: "One line.", edited: true });
    expect((await listPages(store.db)).filter((page) => page.edited).map((page) => page.handle)).toEqual(["about"]);
    await restorePage(store.db, "about");
    expect(await getPage("about", store.db)).toMatchObject({ title: "About Klaev", edited: false });
  });
});

describe("contact messages", () => {
  test("a message needs a name, a way to reply and some words; then it waits until handled", async () => {
    const message = { name: "Bilal", email: "", phone: "0300 1234567", subject: "custom", body: "A jacket in tan, size L." };
    expect(await sendMessage(store.db, { ...message, phone: "" })).toMatchObject({ ok: false, field: "contact" });
    expect(await sendMessage(store.db, { ...message, body: " " })).toMatchObject({ ok: false, field: "body" });
    expect(await sendMessage(store.db, { ...message, email: "not-an-email" })).toMatchObject({ ok: false, field: "contact" });
    expect(await sendMessage(store.db, message)).toEqual({ ok: true });
    const [saved] = await listMessages(store.db);
    expect(saved).toMatchObject({ name: "Bilal", phone: "+923001234567", email: null, subject: "custom" });
    expect(await waitingMessages(store.db)).toBe(1);
    await setHandled(store.db, saved.id, true);
    expect(await waitingMessages(store.db)).toBe(0);
    expect(await listMessages(store.db, { handled: true })).toHaveLength(1);
  });
});
