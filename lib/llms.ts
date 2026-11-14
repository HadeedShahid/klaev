import type { CollectionWithItems, Product } from "./catalog";
import { formatPKR } from "./money";
import type { CodTerms } from "./payment";
import { sizeMeasurement } from "./sizing";
import { instagramProfileLink, STORE, whatsappLink } from "./store";

// What AI tools read about the store, as plain text from the live catalog and pages (the routes in
// app/llms.txt, app/llms-full.txt and app/agents.md):
// - llms.txt: a short guide in the llmstxt.org layout (one H1, a quoted summary, details, then lists
//   of "[name](url): notes", "Optional" last).
// - llms-full.txt: the same store in full, every jacket, size chart, policy and answer in one file.
// - agents.md: how an agent can help someone order. Klaev has no shopping API, so it says so and
//   walks through the website. Shopify's versions describe its own agent tools, which Klaev doesn't have.
// Copy follows the store's rules: no em or en dashes, PKR only, and the courier is never named. The
// bank details stay on each order's private page.

const SITE = STORE.siteUrl;

export type StoreFacts = {
  products: Product[];
  collections: CollectionWithItems[];
  terms: CodTerms;
  // The store's pages (lib/pages.ts), their {advance}-style terms already filled in.
  pages: { handle: string; kind: "page" | "policy"; title: string; description: string; body: string }[];
  faq: { question: string; answer: string }[];
  posts: { handle: string; title: string; summary: string | null }[];
};

// Legal pages an agent can skip; the rest are help a shopper needs.
const SKIPPABLE_PAGES = ["privacy-policy", "terms-of-service"];
// The order llms-full.txt gives the pages in: what someone buying needs first.
const PAGE_ORDER = ["shipping-policy", "refund-policy", "about", "terms-of-service", "privacy-policy"];

const url = (path: string) => `${SITE}${path}`;
const productUrl = (product: Product) => url(`/products/${product.handle}`);
const pageUrl = (page: StoreFacts["pages"][number]) => url(`/${page.kind === "policy" ? "policies" : "pages"}/${page.handle}`);
const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

function summary() {
  return `> Klaev sells men's leather jackets, made in Pakistan and delivered across Pakistan from ${SITE}. Prices are in PKR.`;
}

function details(terms: CodTerms) {
  return [
    `Delivery goes anywhere in Pakistan, and most orders arrive in ${STORE.deliveryDays} days. Cash on delivery costs ${formatPKR(terms.codDeliveryFee)} for delivery, with a ${formatPKR(terms.codAdvance)} advance to confirm the order. A bank transfer gets free delivery. Every order is confirmed on WhatsApp before it ships.`,
    `Sizes can be exchanged within ${STORE.exchangeDays} days of delivery. There are no refunds. Questions go to WhatsApp ${STORE.whatsappDisplay} or ${STORE.email}.`,
  ].join("\n\n");
}

// Which sizes can be bought now, in the words a shopper would use.
function stock(product: Product) {
  const sized = product.variants.filter((variant) => variant.size);
  if (sized.length === 0) return product.variants.some((variant) => variant.available) ? "In stock." : "Sold out.";
  const inStock = sized.filter((variant) => variant.available).map((variant) => variant.size);
  const soldOut = sized.filter((variant) => !variant.available).map((variant) => variant.size);
  if (inStock.length === 0) return "Sold out in every size.";
  return [`In stock: ${inStock.join(", ")}.`, soldOut.length ? `Sold out: ${soldOut.join(", ")}.` : ""].filter(Boolean).join(" ");
}

function collectionTitle(facts: StoreFacts, handle: string) {
  return facts.collections.find((collection) => collection.handle === handle)?.title ?? handle;
}

function collectionLines(facts: StoreFacts) {
  return [
    `- [All jackets](${url("/collections/all")}): every jacket on sale.`,
    ...facts.collections.map((collection) => {
      const word = collection.handle.endsWith("-jackets") ? "jacket" : "piece";
      const count = collection.items.length;
      return `- [${collection.title}](${url(`/collections/${collection.handle}`)}): ${count} ${word}${count === 1 ? "" : "s"}.`;
    }),
  ];
}

export function llmsTxt(facts: StoreFacts) {
  const help = facts.pages.filter((page) => !SKIPPABLE_PAGES.includes(page.handle));
  const skippable = facts.pages.filter((page) => SKIPPABLE_PAGES.includes(page.handle));
  const lines = [
    "# Klaev",
    "",
    summary(),
    "",
    details(facts.terms),
    "",
    "## Jackets",
    "",
    ...facts.products.map((product) => `- [${product.title}](${productUrl(product)}): ${[formatPKR(product.price) + ".", product.tagline ? sentence(product.tagline) : "", stock(product)].filter(Boolean).join(" ")}`),
    "",
    "## Collections",
    "",
    ...collectionLines(facts),
    "",
    "## Help",
    "",
    `- [Size chart](${url("/pages/jackets-size-chart")}): every jacket's measurements, size by size.`,
    ...help.map((page) => `- [${page.title}](${pageUrl(page)}): ${sentence(page.description)}`),
    `- [Track your order](${url("/track")}): with the order number and the mobile number it was placed with.`,
    `- [Contact](${url("/pages/contact")}): WhatsApp, email or the contact form.`,
    "",
    "## For AI agents",
    "",
    `- [Full store guide](${url("/llms-full.txt")}): every jacket with its sizes, stock and size chart, the store's policies and its questions and answers, in one file.`,
    `- [Shopping guide for AI agents](${url("/agents.md")}): how to help someone choose a size and place an order.`,
    "",
    "## Optional",
    "",
    `- [Journal](${url("/blogs/blog")}): notes on leather, fit and care.`,
    ...facts.posts.map((post) => `- [${post.title}](${url(`/blogs/blog/${post.handle}`)})${post.summary ? `: ${sentence(post.summary)}` : ""}`),
    ...skippable.map((page) => `- [${page.title}](${pageUrl(page)}): ${sentence(page.description)}`),
  ];
  return `${lines.join("\n")}\n`;
}

// A page body in the store's format (lib/journal-body.ts) is already Markdown. Under its own "##"
// heading here, its headings go one level down, and its links point at klaev.com.
function asSection(body: string) {
  return body
    .replace(/\r\n?/g, "\n")
    .replace(/^## /gm, "### ")
    .replace(/\]\(\//g, `](${SITE}/`)
    .trim();
}

function sizeChart(product: Product) {
  const chart = product.sizeGuide?.chart;
  if (!chart || chart.rows.length === 0) return [];
  const row = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;
  return [
    "#### Size chart",
    "",
    row([`Measurement (${chart.unit})`, ...chart.sizes]),
    row(["---", ...chart.sizes.map(() => "---")]),
    ...chart.rows.map((measurement) => row([measurement.name, ...measurement.values])),
    ...(chart.notes.length ? ["", chart.notes.join("\n\n")] : []),
    "",
  ];
}

function jacketInFull(facts: StoreFacts, product: Product) {
  const link = productUrl(product);
  const sizes = product.variants.map((variant) => {
    const measure = variant.size ? sizeMeasurement(product.sizeGuide, variant.size) : null;
    const state = variant.available ? "in stock" : "sold out";
    return `- ${variant.size ?? "One size"}: ${state}${measure ? ` (${measure})` : ""}. Link: ${link}?variant=${variant.id}`;
  });
  const sections = product.sections.flatMap((section) => [
    `#### ${section.heading}`,
    "",
    ...(section.items.length ? [section.items.map((item) => `- ${item.title ? `${item.title}: ` : ""}${item.text}`).join("\n"), ""] : []),
    ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
  ]);
  return [
    `### ${product.title}`,
    "",
    link,
    "",
    `- Price: ${formatPKR(product.price)}`,
    ...(product.colour ? [`- Colour: ${product.colour}`] : []),
    `- Collection: ${collectionTitle(facts, product.collection)}`,
    "",
    "Sizes, and the link that opens the page with that size chosen:",
    "",
    ...sizes,
    "",
    ...(product.tagline ? [sentence(product.tagline), ""] : []),
    ...(product.intro.length ? [product.intro.join("\n\n"), ""] : []),
    ...sections,
    ...sizeChart(product),
  ];
}

export function llmsFullTxt(facts: StoreFacts) {
  const ordered = [...facts.pages].sort((a, b) => {
    const rank = (handle: string) => (PAGE_ORDER.includes(handle) ? PAGE_ORDER.indexOf(handle) : PAGE_ORDER.length);
    return rank(a.handle) - rank(b.handle);
  });
  const [buying, rest] = [ordered.filter((page) => page.kind === "policy" && !SKIPPABLE_PAGES.includes(page.handle)), ordered.filter((page) => page.kind !== "policy" || SKIPPABLE_PAGES.includes(page.handle))];
  const page = (entry: StoreFacts["pages"][number]) => [`## ${entry.title}`, "", pageUrl(entry), "", asSection(entry.body), ""];
  const lines = [
    "# Klaev",
    "",
    summary(),
    "",
    details(facts.terms),
    "",
    `The short guide is ${url("/llms.txt")}, and how to help someone order is ${url("/agents.md")}. Prices and stock here are read from the store as this file is asked for.`,
    "",
    "## Jackets",
    "",
    ...facts.products.flatMap((product) => jacketInFull(facts, product)),
    "## Collections",
    "",
    ...collectionLines(facts),
    "",
    ...buying.flatMap(page),
    "## Questions and answers",
    "",
    ...facts.faq.flatMap((item) => [`### ${item.question}`, "", item.answer, ""]),
    ...rest.flatMap(page),
    "## Contact",
    "",
    `- WhatsApp: ${STORE.whatsappDisplay} (${whatsappLink()})`,
    `- Email: ${STORE.email}`,
    `- Instagram: @${STORE.instagram} (${instagramProfileLink})`,
    `- Contact form: ${url("/pages/contact")}`,
    `- Office: ${STORE.address.street}, ${STORE.address.city} ${STORE.address.postalCode}, ${STORE.address.country}`,
    "",
    ...(facts.posts.length
      ? ["## Journal", "", ...facts.posts.map((post) => `- [${post.title}](${url(`/blogs/blog/${post.handle}`)})${post.summary ? `: ${sentence(post.summary)}` : ""}`)]
      : []),
  ];
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function agentsMd(facts: StoreFacts) {
  const { terms } = facts;
  const lines = [
    "# Shopping at Klaev: a guide for AI agents",
    "",
    `> How to help someone buy a Klaev jacket at ${SITE}. Klaev sells men's leather jackets in Pakistan, priced in PKR, and delivers only within Pakistan.`,
    "",
    "There is no shopping API, MCP server or agent checkout. Use the website the way a shopper does: every page is plain HTML that works without an account. Prices, sizes and stock on the jacket pages are live.",
    "",
    "## Finding the right jacket",
    "",
    `- Every jacket on sale, with its price and the sizes in stock, is in ${url("/llms.txt")}, and in full in ${url("/llms-full.txt")}. On the site, they're all at ${url("/collections/all")}.`,
    "- Each jacket page's structured data (schema.org ProductGroup) gives each size its price and whether it's in stock. A sold-out size can't be chosen.",
    `- Check the size against the jacket's measurements on its page or the size chart (${url("/pages/jackets-size-chart")}). If the person's chest measurement isn't known, ask for it rather than guessing.`,
    "",
    "## Placing an order",
    "",
    "1. Open the jacket page with the size chosen: each size has its own link, the page address with ?variant= and that size's id (they're listed in llms-full.txt and the page's structured data). Or choose the size on the page.",
    `2. Add it to the cart, then go to the checkout: ${url("/checkout")}.`,
    "3. Fill in the person's Full name, Mobile number, Email, City and Full address, all their own, and choose how they pay. A discount code goes in only if the person has one.",
    "4. Place the order only after the person has agreed to the jacket, size, total and way to pay.",
    "5. The order page that opens is the person's private link. It shows what to pay and how. Give it only to the person, and never post it anywhere.",
    "",
    "## Paying",
    "",
    `- Cash on delivery: ${formatPKR(terms.codDeliveryFee)} for delivery. The person sends a ${formatPKR(terms.codAdvance)} advance to confirm the order, then pays the rest to the rider in cash.`,
    "- Bank transfer: the whole amount up front, and delivery is free.",
    "- The bank details are on the order page once the order is placed, and the transfer receipt can be uploaded there or sent on WhatsApp. Leave the payment itself to the person.",
    `- Klaev confirms every order on WhatsApp once the advance or the transfer is in, and ships it after that. Most orders arrive in ${STORE.deliveryDays} days.`,
    "",
    "## After the order",
    "",
    `- Tracking: ${url("/track")}, with the order number and the mobile number the order was placed with.`,
    `- Size exchanges within ${STORE.exchangeDays} days of delivery, unworn with the tags on, on WhatsApp. The person covers delivery both ways. There are no refunds (${url("/policies/refund-policy")}).`,
    "- Damaged, or not what was ordered: message Klaev on WhatsApp the day it arrives, with the order number and a photo.",
    "",
    "## Contact",
    "",
    `- WhatsApp: ${STORE.whatsappDisplay} (${whatsappLink()})`,
    `- Email: ${STORE.email}`,
    `- Instagram: @${STORE.instagram} (${instagramProfileLink})`,
    `- Contact form: ${url("/pages/contact")}`,
    "",
    "## Please don't",
    "",
    "- Place an order without the person's go-ahead, or with details they didn't give.",
    "- Promise stock, prices, discounts or delivery dates the site doesn't show.",
    "- Open /admin, /api or anyone else's order link.",
  ];
  return `${lines.join("\n")}\n`;
}
