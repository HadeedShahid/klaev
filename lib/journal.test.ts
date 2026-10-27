// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { createTestDb } from "./db/test-db";
import { parseBody, readingMinutes } from "./journal-body";
import { createPost, getPost, getPublishedPost, listPublished, savePost, type PostInput } from "./journal";

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
}, 60_000);
afterAll(() => store?.dispose());

const input: PostInput = {
  title: "How to care for lambskin",
  handle: "",
  excerpt: "Three habits that keep it soft.",
  body: "Lambskin is soft.\nIt likes air.\n\n## Three habits\n- Hang it on a wide hanger.\n- Keep it dry.\n\nThat's all.",
  coverAlt: "",
  status: "published",
  publishedOn: "2026-10-20",
  seoTitle: "",
  seoDescription: "",
};

describe("journal", () => {
  test("a body reads as paragraphs, headings and lists, never HTML", () => {
    expect(parseBody(input.body)).toEqual([
      { kind: "paragraph", text: "Lambskin is soft. It likes air." },
      { kind: "heading", text: "Three habits" },
      { kind: "list", items: ["Hang it on a wide hanger.", "Keep it dry."] },
      { kind: "paragraph", text: "That's all." },
    ]);
    expect(parseBody("<script>alert(1)</script>")).toEqual([{ kind: "paragraph", text: "<script>alert(1)</script>" }]);
    expect(readingMinutes("word ".repeat(700))).toBe(3);
  });

  test("a draft gets its address from the title; publishing needs a body; future dates wait", async () => {
    const created = await createPost(store.db, "How to care for lambskin!");
    if (!created.ok) throw new Error(created.message);
    expect(await getPost(store.db, created.id)).toMatchObject({ handle: "how-to-care-for-lambskin", status: "draft" });

    expect(await savePost(store.db, created.id, { ...input, body: " " })).toMatchObject({ ok: false });
    expect(await savePost(store.db, created.id, { ...input, title: "Care, the short version — really" })).toMatchObject({ ok: false });
    expect(await savePost(store.db, created.id, input)).toEqual({ ok: true });

    const now = new Date("2026-10-27T12:00:00+05:00");
    expect((await listPublished(store.db, now)).map((post) => post.handle)).toEqual(["how-to-care-for-lambskin"]);
    expect(await getPublishedPost("how-to-care-for-lambskin", store.db, now)).toMatchObject({ title: "How to care for lambskin" });

    await savePost(store.db, created.id, { ...input, publishedOn: "2026-11-05" });
    expect(await listPublished(store.db, now)).toEqual([]);
    await savePost(store.db, created.id, { ...input, status: "draft" });
    expect(await getPublishedPost("how-to-care-for-lambskin", store.db, new Date("2026-12-01"))).toBeNull();
  });

  test("addresses stay unique", async () => {
    const first = await createPost(store.db, "Fit guide");
    const second = await createPost(store.db, "Fit guide");
    if (!first.ok || !second.ok) throw new Error("not created");
    expect((await getPost(store.db, second.id))?.handle).toBe("fit-guide-2");
    expect(await savePost(store.db, second.id, { ...input, handle: "fit-guide" })).toMatchObject({ ok: false });
  });
});
