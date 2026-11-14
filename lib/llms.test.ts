// @vitest-environment node
import { describe, expect, test } from "vitest";

import type { CollectionWithItems, Product } from "./catalog";
import { agentsMd, llmsFullTxt, llmsTxt, type StoreFacts } from "./llms";

const cropped: Product = {
  handle: "black-cropped-leather-jacket",
  status: "active",
  title: "Black Cropped Sheepskin Leather Jacket",
  collection: "cropped-leather-jackets",
  price: 17999,
  compareAtPrice: null,
  colour: "Black",
  tagline: "Cropped clean. Built in full grain.",
  seoTitle: null,
  seoDescription: null,
  intro: ["Cut to sit at the waist.", "A-grade full-grain sheepskin, finished in Pakistan."],
  sections: [
    { heading: "Details", items: [{ title: "Leather", text: "Full-grain sheepskin." }, { title: null, text: "YKK zip." }], paragraphs: [] },
    { heading: "Care", items: [], paragraphs: ["Wipe with a dry cloth."] },
  ],
  variants: [
    { id: "11", sku: "CROP-BLK-S", size: "S", colour: "Black", available: true },
    { id: "12", sku: "CROP-BLK-M", size: "M", colour: "Black", available: false },
  ],
  sizeGuide: {
    kind: "garment",
    rows: [
      { size: "S", chestFlat: 20.5, length: 24 },
      { size: "M", chestFlat: 21.5, length: 25 },
    ],
    chart: { unit: "in", sizes: ["S", "M"], rows: [{ name: "Chest (laid flat)", values: [20.5, 21.5] }, { name: "Length", values: [24, 25] }], notes: ["Measured laid flat."] },
  },
  images: [],
  tags: [],
};

const suede: Product = {
  ...cropped,
  handle: "black-suede-jacket",
  title: "Black Goatskin Suede Jacket",
  collection: "suede-jackets",
  price: 18999,
  tagline: null,
  intro: [],
  sections: [],
  variants: [{ id: "21", sku: "SUEDE-XL", size: "XL", colour: "Black", available: false }],
  sizeGuide: null,
};

const collections: CollectionWithItems[] = [
  { handle: "cropped-leather-jackets", title: "Men’s Cropped Leather Jackets", items: [cropped] },
  { handle: "suede-jackets", title: "Suede Jackets", items: [suede] },
];

const facts: StoreFacts = {
  products: [cropped, suede],
  collections,
  terms: { codDeliveryFee: 900, codAdvance: 2000 },
  pages: [
    { handle: "about", kind: "page", title: "About Klaev", description: "Real leather, made in Pakistan.", body: "Klaev makes jackets.\n\n## Where it comes from\nPakistani tanneries." },
    {
      handle: "shipping-policy",
      kind: "policy",
      title: "Delivery",
      description: "Delivery across Pakistan.",
      body: "We deliver anywhere in Pakistan.\n\n## Tracking\nFollow it on the [tracking page](/track).",
    },
    { handle: "refund-policy", kind: "policy", title: "Exchanges and refunds", description: "Size exchanges within 7 days of delivery. No refunds.", body: "Size exchanges within 7 days." },
  ],
  faq: [{ question: "Is it real leather?", answer: "Yes. Full-grain sheepskin and lambskin, or goatskin suede." }],
  posts: [{ handle: "how-a-cropped-leather-jacket-should-fit", title: "How a Cropped Leather Jacket Should Fit", summary: "How it should sit at the waist." }],
};

// The store's copy rules (PRODUCT.md, AGENTS.md): no em or en dashes, and the courier is never named.
function followsCopyRules(text: string) {
  expect(text).not.toMatch(/[–—]/);
  expect(text).not.toMatch(/postex/i);
}

describe("llms.txt", () => {
  const text = llmsTxt(facts);

  // llmstxt.org: one H1 with the site's name, a blockquote summary, details, then H2 lists of
  // "[name](url): notes", with "Optional" last for what an agent can skip.
  test("follows the llms.txt layout: the name, a summary, details, then lists of links", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("# Klaev");
    expect(lines.filter((line) => line.startsWith("# "))).toHaveLength(1);
    expect(lines[2]).toMatch(/^> .*leather jackets.*Pakistan/);
    const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
    expect(sections).toEqual(["Jackets", "Collections", "Help", "For AI agents", "Optional"]);
    for (const item of lines.filter((line) => line.startsWith("- "))) expect(item).toMatch(/^- \[[^\]]+\]\(https:\/\/klaev\.com\/[^)]*\)(: .+)?$/);
  });

  test("lists every jacket on sale with its price and which sizes are in stock", () => {
    expect(text).toContain(
      "- [Black Cropped Sheepskin Leather Jacket](https://klaev.com/products/black-cropped-leather-jacket): PKR 17,999. Cropped clean. Built in full grain. In stock: S. Sold out: M.",
    );
    expect(text).toContain("- [Black Goatskin Suede Jacket](https://klaev.com/products/black-suede-jacket): PKR 18,999. Sold out in every size.");
  });

  test("states the terms as checkout charges them, and points to the full guide and the agents' guide", () => {
    expect(text).toContain("Cash on delivery costs PKR 900 for delivery, with a PKR 2,000 advance to confirm the order. A bank transfer gets free delivery.");
    expect(llmsTxt({ ...facts, terms: { codDeliveryFee: 1100, codAdvance: 2500 } })).toContain("PKR 1,100 for delivery, with a PKR 2,500 advance");
    expect(text).toContain("- [All jackets](https://klaev.com/collections/all): every jacket on sale.");
    expect(text).toContain("- [Men’s Cropped Leather Jackets](https://klaev.com/collections/cropped-leather-jackets): 1 jacket.");
    expect(text).toContain("- [Size chart](https://klaev.com/pages/jackets-size-chart)");
    expect(text).toContain("- [Exchanges and refunds](https://klaev.com/policies/refund-policy): Size exchanges within 7 days of delivery. No refunds.");
    expect(text).toContain("- [Full store guide](https://klaev.com/llms-full.txt)");
    expect(text).toContain("- [Shopping guide for AI agents](https://klaev.com/agents.md)");
    expect(text).toContain("- [How a Cropped Leather Jacket Should Fit](https://klaev.com/blogs/blog/how-a-cropped-leather-jacket-should-fit): How it should sit at the waist.");
    followsCopyRules(text);
  });
});

describe("llms-full.txt", () => {
  const text = llmsFullTxt(facts);

  test("gives each jacket in full: price, every size with its stock and measurement, its words and its size chart", () => {
    expect(text.split("\n")[0]).toBe("# Klaev");
    expect(text).toContain("### Black Cropped Sheepskin Leather Jacket\n\nhttps://klaev.com/products/black-cropped-leather-jacket");
    expect(text).toContain("- Price: PKR 17,999");
    expect(text).toContain("- Colour: Black");
    expect(text).toContain("- Collection: Men’s Cropped Leather Jackets");
    expect(text).toContain("- S: in stock (Jacket chest 41 in). Link: https://klaev.com/products/black-cropped-leather-jacket?variant=11");
    expect(text).toContain("- M: sold out (Jacket chest 43 in)");
    expect(text).toContain("Cut to sit at the waist.\n\nA-grade full-grain sheepskin, finished in Pakistan.");
    expect(text).toContain("#### Details\n\n- Leather: Full-grain sheepskin.\n- YKK zip.");
    expect(text).toContain("#### Care\n\nWipe with a dry cloth.");
    expect(text).toContain("| Measurement (in) | S | M |\n| --- | --- | --- |\n| Chest (laid flat) | 20.5 | 21.5 |\n| Length | 24 | 25 |");
    expect(text).toContain("Measured laid flat.");
  });

  test("has every store page in full, its headings one level down and its links absolute, and the questions answered", () => {
    expect(text).toContain("## Delivery\n\nhttps://klaev.com/policies/shipping-policy\n\nWe deliver anywhere in Pakistan.\n\n### Tracking\nFollow it on the [tracking page](https://klaev.com/track).");
    expect(text).toContain("## About Klaev\n\nhttps://klaev.com/pages/about");
    expect(text).toContain("### Where it comes from");
    expect(text).toContain("## Questions and answers\n\n### Is it real leather?\n\nYes. Full-grain sheepskin and lambskin, or goatskin suede.");
    expect(text).toContain("## Contact");
    expect(text).toContain("WhatsApp: +92 323 1483650 (https://wa.me/923231483650)");
    expect(text).toContain("## Journal\n\n- [How a Cropped Leather Jacket Should Fit](https://klaev.com/blogs/blog/how-a-cropped-leather-jacket-should-fit)");
    // With no articles published, there's no empty heading for them.
    expect(llmsFullTxt({ ...facts, posts: [] })).not.toContain("## Journal");
    followsCopyRules(text);
  });
});

describe("agents.md", () => {
  const text = agentsMd(facts);

  test("tells an agent how to help someone order: no API, the steps, and the person's go-ahead first", () => {
    expect(text.split("\n")[0]).toBe("# Shopping at Klaev: a guide for AI agents");
    expect(text).toContain("There is no shopping API, MCP server or agent checkout.");
    expect(text).toContain("https://klaev.com/checkout");
    expect(text).toContain("Full name, Mobile number, Email, City and Full address");
    expect(text).toContain("Place the order only after the person has agreed to the jacket, size, total and way to pay.");
    expect(text).toContain("?variant=");
  });

  test("states how paying works with today's amounts, and leaves the payment to the person", () => {
    expect(text).toContain("- Cash on delivery: PKR 900 for delivery. The person sends a PKR 2,000 advance to confirm the order, then pays the rest to the rider in cash.");
    expect(text).toContain("- Bank transfer: the whole amount up front, and delivery is free.");
    expect(text).toContain("Leave the payment itself to the person.");
    expect(agentsMd({ ...facts, terms: { codDeliveryFee: 1100, codAdvance: 2500 } })).toContain("PKR 1,100 for delivery. The person sends a PKR 2,500 advance");
    // The bank details are only ever on the person's own order page.
    expect(text).not.toMatch(/IBAN|account number/i);
    followsCopyRules(text);
  });
});
