// Turns a Shopify journal article's public page into a post for this store's journal
// (scripts/import-journal.ts): the page's title, dates, search fields and cover, and its body
// rewritten from HTML into the journal's plain-text format (lib/journal-body.ts).

import { insert } from "./sql";

// Klaev's articles on Shopify, all under klaev.com/blogs/blog/, which this store serves too.
export const JOURNAL_HANDLES = [
  "how-to-care-for-leather-jackets-belts-complete-guide",
  "leather-jacket-trends-2025-minimalist-fashion-guide",
  "how-to-style-leather-jacket-minimalist-winter-guide",
  "the-return-of-leather-why-it-s-the-season-s-must-have-material",
  "winter-capsule-wardrobe-layering-guide",
  "inside-klaev-the-design-philosophy-behind-quiet-luxury",
  "how-a-cropped-leather-jacket-should-fit",
];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  ndash: "–",
  mdash: "—",
};

const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? whole;
    return String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  });

const squash = (text: string) => text.replace(/\s+/g, " ").trim();
const attribute = (tag: string, name: string) => {
  const value = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];
  return value === undefined ? undefined : decode(value);
};
const textOf = (html: string) => squash(decode(html.replace(/<[^>]+>/g, " ")));

export type ShopifyArticle = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  updatedAt: string;
  coverUrl: string;
  coverAlt: string;
  bodyHtml: string;
};

// What the article template (Horizon) puts on the page.
export function pageArticle(html: string): ShopifyArticle {
  const find = (pattern: RegExp, what: string) => {
    const match = html.match(pattern);
    if (!match) throw new Error(`No ${what} on the page`);
    return match[1];
  };
  const cover = html.match(/<img\b[^>]*class="blog-post-featured-image__image[^>]*>/)?.[0];
  if (!cover) throw new Error("No cover photo on the page");
  return {
    title: textOf(find(/<h1\b[^>]*>([\s\S]*?)<\/h1>/, "title")),
    // The store's layout adds "| Klaev" itself.
    seoTitle: textOf(find(/<title>([\s\S]*?)<\/title>/, "search title")).replace(/\s*[|–—-]\s*Klaev(?: Pakistan)?$/i, ""),
    seoDescription: squash(decode(find(/<meta\s+name="description"\s+content="([^"]*)"/, "description"))),
    publishedAt: find(/"datePublished":"([^"]+)"/, "publish date"),
    updatedAt: find(/"dateModified":"([^"]+)"/, "change date"),
    coverUrl: find(/<meta\s+property="og:image"\s+content="([^"]+)"/, "cover address"),
    coverAlt: squash(attribute(cover, "alt") ?? ""),
    bodyHtml: find(/<div class="blog-post-content rte">\s*<rte-formatter>([\s\S]*?)<\/rte-formatter>/, "article body").trim(),
  };
}

// Links to klaev.com become paths on this store; other https and mailto links stay as they are.
function linkTarget(href: string) {
  const url = decode(href).trim();
  const store = url.match(/^(?:https?:)?\/\/(?:www\.)?klaev\.com(\/\S*)?$/i);
  if (store) return store[1] ?? "/";
  if (/^\/(?!\/)|^https:\/\/|^mailto:/.test(url)) return url;
  return null;
}

type Unit = { kind: "paragraph" | "heading" | "item"; text: string; list?: number };

// The article's HTML as the journal's plain text: a blank line between paragraphs, "## " for every
// heading level, "- " for list items and [words](/path) for links. Bold and italics are dropped,
// and a table becomes a list with one item per row, labelled by the header row.
export function htmlToBody(html: string): string {
  const units: Unit[] = [];
  let buffer = "";
  let kind: Unit["kind"] = "paragraph";
  let lists = 0;
  const openLists: number[] = [];
  let itemDepth = 0;
  let link: { href: string | null; start: number } | null = null;
  let table: { rows: { cells: string[]; header: boolean }[] } | null = null;
  let row: { cells: string[]; header: boolean } | null = null;
  let cell: string | null = null;
  let skip = 0;

  const flush = () => {
    const text = squash(buffer);
    if (text) units.push({ kind, text, list: kind === "item" ? openLists.at(-1) : undefined });
    buffer = "";
  };

  for (const [token, closing, name] of html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|[^<]+/g)) {
    if (!name) {
      if (skip || token.startsWith("<!--")) continue;
      if (cell !== null) cell += decode(token);
      else buffer += decode(token);
      continue;
    }
    const tag = name.toLowerCase();
    const open = !closing;
    if (tag === "script" || tag === "style") {
      skip += open ? 1 : -1;
      continue;
    }
    if (table) {
      if (tag === "tr" && open) row = { cells: [], header: true };
      else if ((tag === "td" || tag === "th") && open) {
        cell = "";
        if (tag === "td" && row) row.header = false;
      } else if ((tag === "td" || tag === "th") && cell !== null) {
        row?.cells.push(squash(cell));
        cell = null;
      } else if (tag === "tr" && row) {
        table.rows.push(row);
        row = null;
      } else if (tag === "table" && !open) {
        const [first, ...others] = table.rows;
        const labels = first?.header ? first.cells : null;
        const list = ++lists;
        for (const { cells } of labels ? others : table.rows) {
          const [label, ...values] = cells;
          const parts = values
            .map((value, index) => (value ? (labels?.[index + 1] ? `${labels[index + 1]} ${value[0].toLowerCase()}${value.slice(1)}` : value) : ""))
            .filter(Boolean);
          units.push({ kind: "item", text: parts.length ? `${label}: ${parts.join(". ")}.` : label, list });
        }
        table = null;
      }
      continue;
    }
    switch (tag) {
      case "a":
        if (open) link = { href: linkTarget(attribute(token, "href") ?? ""), start: buffer.length };
        else if (link) {
          const inner = buffer.slice(link.start);
          const words = squash(inner);
          if (link.href && words) {
            const before = inner.match(/^\s*/)?.[0] ?? "";
            const after = inner.match(/\s*$/)?.[0] ?? "";
            buffer = `${buffer.slice(0, link.start)}${before}[${words}](${link.href})${after}`;
          }
          link = null;
        }
        break;
      case "br":
        if (itemDepth) buffer += " ";
        else flush();
        break;
      case "hr":
        flush();
        break;
      case "p":
      case "div":
      case "blockquote":
      case "section":
        if (itemDepth) buffer += " ";
        else {
          flush();
          kind = "paragraph";
        }
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        flush();
        kind = open ? "heading" : itemDepth ? "item" : "paragraph";
        break;
      case "ul":
      case "ol":
        flush();
        if (open) openLists.push(++lists);
        else openLists.pop();
        kind = itemDepth ? "item" : "paragraph";
        break;
      case "li":
        flush();
        itemDepth = Math.max(0, itemDepth + (open ? 1 : -1));
        kind = open || itemDepth ? "item" : "paragraph";
        break;
      case "table":
        if (open) {
          flush();
          table = { rows: [] };
        }
        break;
    }
  }
  flush();

  return units
    .map((unit, index) => {
      const line = unit.kind === "heading" ? `## ${unit.text}` : unit.kind === "item" ? `- ${unit.text}` : unit.text;
      if (index === 0) return line;
      const previous = units[index - 1];
      return (unit.kind === "item" && previous.kind === "item" && previous.list === unit.list ? "\n" : "\n\n") + line;
    })
    .join("");
}

// PRODUCT.md: no em or en dashes. A range reads "to"; anywhere else the dash becomes a comma, to be
// read over by hand where a full stop fits better.
export const noDashes = (text: string) => text.replace(/(\d)\s*[–—]\s*(?=\d)/g, "$1 to ").replace(/[ \t]*[–—][ \t]*/g, ", ");

// Sentences that talk about returns, refunds, exchanges or guarantees, to check against the store's
// real policy (size exchanges within 7 days, no refunds) before anything is published.
const POLICY = /refund|money[- ]back|\breturn|exchange|warrant|guarantee|\b\d+[- ]days?\b|free (?:delivery|shipping)|lifetime/i;

export function policyFlags(body: string) {
  return body
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^(?:## |- )/, "").trim())
    .filter((sentence) => POLICY.test(sentence));
}

// One article as it goes into the posts table (lib/db/schema.ts). Dates are ISO strings as Shopify
// gave them; the cover is already stored in the klaev-media bucket.
export type JournalArticle = {
  handle: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverSrc: string;
  coverWidth: number;
  coverHeight: number;
  coverAlt: string;
  publishedAt: string;
  updatedAt: string;
  seoTitle: string;
  seoDescription: string;
};

// The checks savePost() makes in the admin, plus the same dash rule on every other field.
export function articleProblems(article: JournalArticle) {
  const problems: string[] = [];
  const fields = [article.title, article.excerpt ?? "", article.body, article.coverAlt, article.seoTitle, article.seoDescription];
  if (!article.title.trim() || article.title.length > 150) problems.push("the title is empty or over 150 characters");
  if (!article.body.trim()) problems.push("the body is empty");
  if (fields.some((field) => /[–—]/.test(field))) problems.push("there is an em or en dash");
  if (article.seoTitle.trim().length > 70) problems.push("the search title is over 70 characters");
  if (article.seoDescription.trim().length > 320) problems.push("the search description is over 320 characters");
  if (/<[a-z/][^>]*>/i.test(article.body)) problems.push("the body has HTML in it");
  if (Number.isNaN(Date.parse(article.publishedAt))) problems.push("the publish date doesn't read");
  return problems;
}

// One statement per article, published, with its original date. Running them again updates the
// same rows (the handle is unique), so the import can be repeated after an edit.
export function journalStatements(articles: JournalArticle[]) {
  return articles.map((article) => {
    const published = new Date(article.publishedAt);
    const updated = new Date(Math.max(published.getTime(), Date.parse(article.updatedAt) || 0));
    const row = {
      handle: article.handle,
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      cover_src: article.coverSrc,
      cover_width: article.coverWidth,
      cover_height: article.coverHeight,
      cover_alt: article.coverAlt,
      status: "published",
      published_at: published,
      seo_title: article.seoTitle,
      seo_description: article.seoDescription,
      created_at: published,
      updated_at: updated,
    };
    const changes = Object.keys(row)
      .filter((column) => column !== "handle" && column !== "created_at")
      .map((column) => `${column} = excluded.${column}`);
    return `${insert("posts", row)} ON CONFLICT (handle) DO UPDATE SET ${changes.join(", ")}`;
  });
}
