import { describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { HOME_FAQ } from "@/data/home-faq";

// The brand rules from PRODUCT.md, applied to every piece of product and FAQ copy, drafts included,
// so belts are already clean when they launch.
const BANNED: [RegExp, string][] = [
  [/[–—]/, "no em or en dashes"],
  [/\belevat/i, "luxury cliché"],
  [/\btimeless/i, "luxury cliché"],
  [/make a statement|statement piece/i, "hype"],
  [/\bperfect(ly)?\b/i, "overselling"],
  [/\bunique\b/i, "filler"],
  [/high-end/i, "luxury cliché"],
  [/quiet(ly)? luxur/i, "luxury cliché"],
  [/every man should/i, "hype"],
  [/\bshoes?\b|footwear/i, "no footwear references"],
  [/guarantee/i, "implies a warranty the store does not offer"],
  [/pakistani-made/i, "write made in Pakistan"],
  [/size chart page/i, "points at a page that does not exist"],
  [/standard international sizing/i, "sizes are stated by chest measurement"],
  [/\$|€|£|\bUSD\b/, "PKR only"],
];

type Product = (typeof snapshot.products)[number];

function productTexts(product: Product) {
  return [
    product.tagline ?? "",
    ...product.intro,
    ...product.sections.flatMap((section) => [
      ...section.items.flatMap((item) => [item.title ?? "", item.text]),
      ...section.paragraphs,
    ]),
  ];
}

describe("product copy keeps the brand rules", () => {
  for (const product of snapshot.products) {
    test(product.handle, () => {
      for (const text of productTexts(product)) {
        for (const [pattern, rule] of BANNED) {
          expect(text, `${rule}: "${text}"`).not.toMatch(pattern);
        }
      }
    });
  }
});

describe("FAQ copy keeps the brand rules", () => {
  for (const item of HOME_FAQ) {
    test(item.question, () => {
      for (const text of [item.question, item.answer]) {
        for (const [pattern, rule] of BANNED) {
          expect(text, `${rule}: "${text}"`).not.toMatch(pattern);
        }
      }
    });
  }
});
