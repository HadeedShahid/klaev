// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { parseBody } from "@/lib/journal-body";
import { createTestDb } from "@/lib/db/test-db";
import { listPublished } from "@/lib/journal";

import { articleProblems, htmlToBody, journalStatements, noDashes, pageArticle, policyFlags, type JournalArticle } from "./journal-import";

// Made-up pages in the shape of Shopify's article template. The real articles' text stays out of
// the repository (data/private/journal/, ignored by git).
const page = (body: string, head = "") => `<html><head>
<title>
  Leather Notes | Klaev Pakistan
</title>
<meta name="description" content="How we look after leather &amp; why.">
<meta property="og:image" content="https://klaev.com/cdn/shop/articles/notes.jpg?v=1764237089">
${head}
<script type="application/ld+json">{"@type":"BlogPosting","datePublished":"2025-10-30T23:11:49+05:00","dateModified":"2025-10-31T14:31:08+05:00"}</script>
</head><body>
<h1 class="text-block">Leather &amp; Notes</h1>
<img src="//klaev.com/cdn/shop/articles/notes.jpg?v=1764237089&amp;width=3840" alt="A jacket on a chair " srcset="x" width="1200" height="1200" loading="eager" class="blog-post-featured-image__image border-style">
<div class="blog-post-content rte">
  <rte-formatter>${body}</rte-formatter>
</div>
</body></html>`;

describe("pageArticle", () => {
  test("reads the title, search title, description, dates and cover from the page", () => {
    const article = pageArticle(page("<p>Hello.</p>"));
    expect(article).toMatchObject({
      title: "Leather & Notes",
      seoTitle: "Leather Notes",
      seoDescription: "How we look after leather & why.",
      publishedAt: "2025-10-30T23:11:49+05:00",
      updatedAt: "2025-10-31T14:31:08+05:00",
      coverUrl: "https://klaev.com/cdn/shop/articles/notes.jpg?v=1764237089",
      coverAlt: "A jacket on a chair",
    });
    expect(article.bodyHtml).toBe("<p>Hello.</p>");
  });

  test("drops the store name Shopify put after the search title, however it was written", () => {
    const html = page("<p>x</p>").replace(/<title>[\s\S]*?<\/title>/, "<title>\n  The Return of Leather\n– Klaev\n</title>");
    expect(pageArticle(html).seoTitle).toBe("The Return of Leather");
  });
});

describe("htmlToBody", () => {
  test("paragraphs, headings of any level and lists, separated by blank lines", () => {
    const body = htmlToBody(
      "<p>First <strong>bold</strong> and <em>soft</em>.</p><h2>A heading</h2><h3>Smaller</h3><h4>Smallest</h4>" +
        "<ul><li>One</li><li><strong>Two:</strong> more</li></ul><ol><li>Three</li></ol><p>Last.</p>",
    );
    expect(body).toBe("First bold and soft.\n\n## A heading\n\n## Smaller\n\n## Smallest\n\n- One\n- Two: more\n\n- Three\n\nLast.");
    expect(parseBody(body).map((block) => block.kind)).toEqual(["paragraph", "heading", "heading", "heading", "list", "list", "paragraph"]);
  });

  test("links on the store become paths; links elsewhere keep their https address", () => {
    const body = htmlToBody(
      '<p>See <a href="https://klaev.com/collections/all">the collection</a>, <a href="/products/x" title="x">this</a> and ' +
        '<a href="https://example.com/guide">a guide</a>.</p>',
    );
    expect(body).toBe("See [the collection](/collections/all), [this](/products/x) and [a guide](https://example.com/guide).");
  });

  test("line breaks start a new paragraph; rules, empty paragraphs and spare spaces go", () => {
    expect(htmlToBody("<p>One.<br>Two.<br/></p><hr><p>&nbsp;</p><blockquote><p>  A   quote. </p></blockquote><div>Three &amp; four</div>")).toBe(
      "One.\n\nTwo.\n\nA quote.\n\nThree & four",
    );
  });

  test("a table becomes a list, one row per item, labelled by the header row", () => {
    const body = htmlToBody(
      "<table><thead><tr><th>Type</th><th>Look</th><th>Care</th></tr></thead>" +
        "<tbody><tr><td>Full-grain</td><td>Natural grain</td><td>Standard</td></tr><tr><td>Suede</td><td>Soft</td><td></td></tr></tbody></table>",
    );
    expect(body).toBe("- Full-grain: Look natural grain. Care standard.\n- Suede: Look soft.");
  });
});

describe("noDashes", () => {
  test("ranges become 'to', and a dash between words becomes a comma", () => {
    expect(noDashes("2–3 years, 20.5—21.5")).toBe("2 to 3 years, 20.5 to 21.5");
    expect(noDashes("It isn’t loud — it’s felt. Leather—always")).toBe("It isn’t loud, it’s felt. Leather, always");
    expect(noDashes("- A list item — with a note")).toBe("- A list item, with a note");
  });
});

describe("policyFlags", () => {
  test("finds sentences about returns, refunds and guarantees, and leaves the rest", () => {
    const flags = policyFlags("Enjoy 30-day returns. The leather is soft. Full refund if unhappy! We exchange sizes.");
    expect(flags).toEqual(["Enjoy 30-day returns.", "Full refund if unhappy!", "We exchange sizes."]);
  });
});

describe("articleProblems", () => {
  const good: JournalArticle = {
    handle: "notes",
    title: "Notes",
    excerpt: null,
    body: "One.",
    coverSrc: "https://media.example/journal/notes/abcdef012345.webp",
    coverWidth: 1200,
    coverHeight: 1200,
    coverAlt: "A jacket",
    publishedAt: "2025-10-30T23:11:49+05:00",
    updatedAt: "2025-10-30T23:11:49+05:00",
    seoTitle: "Notes",
    seoDescription: "About notes.",
  };

  test("holds an article to the admin's rules before it is written", () => {
    expect(articleProblems(good)).toEqual([]);
    expect(articleProblems({ ...good, coverAlt: "A jacket — black", body: "<p>One.</p>", seoTitle: "x".repeat(71) })).toEqual([
      "there is an em or en dash",
      "the search title is over 70 characters",
      "the body has HTML in it",
    ]);
  });
});

describe("journalStatements", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb();
  }, 60_000);
  afterAll(() => db.dispose());

  const article = (handle: string, publishedAt: string): JournalArticle => ({
    handle,
    title: `Title ${handle}`,
    excerpt: "An excerpt.",
    body: "One.\n\n## Two\n\n- Three",
    coverSrc: `https://media.example/journal/${handle}/abcdef012345.webp`,
    coverWidth: 1200,
    coverHeight: 1500,
    coverAlt: "A jacket",
    publishedAt,
    updatedAt: publishedAt,
    seoTitle: "Search title",
    seoDescription: "Search description.",
  });

  test("publishes each article at its address with its original date, newest first", async () => {
    const statements = journalStatements([article("older", "2025-10-30T23:11:49+05:00"), article("newer", "2026-09-20T13:11:30+05:00")]);
    await db.run(statements);
    const posts = await listPublished(db.db);
    expect(posts.map((post) => post.handle)).toEqual(["newer", "older"]);
    expect(posts[1]).toMatchObject({
      title: "Title older",
      status: "published",
      coverSrc: "https://media.example/journal/older/abcdef012345.webp",
      coverWidth: 1200,
      coverHeight: 1500,
      coverAlt: "A jacket",
      seoTitle: "Search title",
      seoDescription: "Search description.",
    });
    expect(posts[1].publishedAt?.toISOString()).toBe("2025-10-30T18:11:49.000Z");
  });

  test("running it again updates the same rows instead of adding more", async () => {
    const changed = { ...article("older", "2025-10-30T23:11:49+05:00"), title: "Changed" };
    await db.run(journalStatements([changed]));
    const posts = await listPublished(db.db);
    expect(posts).toHaveLength(2);
    expect(posts.find((post) => post.handle === "older")?.title).toBe("Changed");
  });
});
