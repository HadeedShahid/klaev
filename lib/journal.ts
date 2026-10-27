import "server-only";

import { and, desc, eq, isNotNull, like, lte, ne, sql } from "drizzle-orm";

import { slugify } from "./admin/products";
import { getDb, type Db } from "./db";
import { POST_STATUSES, posts } from "./db/schema";

export type PostStatus = (typeof POST_STATUSES)[number];
type Result = { ok: true } | { ok: false; message: string };
const fail = (message: string) => ({ ok: false as const, message });

const live = (now: Date) => and(eq(posts.status, "published"), isNotNull(posts.publishedAt), lte(posts.publishedAt, now));

// Published articles, newest first: what /blogs/blog lists. A post dated in the future waits until then.
export async function listPublished(db?: Db, now = new Date()) {
  return (db ?? (await getDb())).select().from(posts).where(live(now)).orderBy(desc(posts.publishedAt), desc(posts.id));
}

export async function getPublishedPost(handle: string, db?: Db, now = new Date()) {
  const [post] = await (db ?? (await getDb())).select().from(posts).where(and(eq(posts.handle, handle), live(now)));
  return post ?? null;
}

export type Post = typeof posts.$inferSelect;

// Every post for the admin, drafts first, then newest.
export async function listPosts(db: Db) {
  return db
    .select()
    .from(posts)
    .orderBy(sql`${posts.status} = 'published'`, desc(posts.publishedAt), desc(posts.id));
}

export async function getPost(db: Db, id: number) {
  if (!Number.isSafeInteger(id)) return null;
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  return post ?? null;
}

async function uniqueHandle(db: Db, base: string, except?: number) {
  const taken = new Set(
    (await db.select({ handle: posts.handle }).from(posts).where(and(like(posts.handle, `${base}%`), except ? ne(posts.id, except) : undefined))).map(
      (row) => row.handle,
    ),
  );
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix++) if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
}

// A new draft with just a title; the rest is written on its page.
export async function createPost(db: Db, title: string): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const clean = title.trim();
  if (!clean || clean.length > 150) return fail("Give the article a title.");
  const base = slugify(clean);
  if (!base) return fail("The title needs at least one letter or number.");
  const [created] = await db
    .insert(posts)
    .values({ title: clean, handle: await uniqueHandle(db, base) })
    .returning({ id: posts.id });
  return { ok: true, id: created.id };
}

export type PostInput = {
  title: string;
  handle: string;
  excerpt: string;
  body: string;
  coverAlt: string;
  status: string;
  publishedOn: string;
  seoTitle: string;
  seoDescription: string;
};

// Everything on the article's page in one save. Publishing needs a body; with no date it's dated today.
export async function savePost(db: Db, id: number, input: PostInput): Promise<Result> {
  const post = await getPost(db, id);
  if (!post) return fail("That article isn't there any more.");
  const title = input.title.trim();
  if (!title || title.length > 150) return fail("Give the article a title.");
  const status = POST_STATUSES.find((candidate) => candidate === input.status);
  if (!status) return fail("Choose draft or published.");
  const handle = slugify(input.handle || title);
  if (!handle) return fail("The address needs at least one letter or number.");
  if ((await uniqueHandle(db, handle, id)) !== handle) return fail(`Another article already uses /blogs/blog/${handle}.`);
  if (status === "published" && !input.body.trim()) return fail("Write the article before publishing it.");
  if (/[–—]/.test(title + input.excerpt + input.body)) return fail("Use a comma or a full stop instead of a dash.");
  if (input.publishedOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn)) return fail("Choose the date from the calendar.");
  if (input.seoTitle.trim().length > 70) return fail("Keep the search title to 70 characters; search engines cut the rest.");
  if (input.seoDescription.trim().length > 320) return fail("Keep the search description to 320 characters.");
  const publishedAt = input.publishedOn ? new Date(`${input.publishedOn}T09:00:00+05:00`) : status === "published" ? (post.publishedAt ?? new Date()) : post.publishedAt;
  await db
    .update(posts)
    .set({
      title,
      handle,
      excerpt: input.excerpt.trim() || null,
      body: input.body.trim(),
      coverAlt: input.coverAlt.trim() || null,
      status,
      publishedAt,
      seoTitle: input.seoTitle.trim() || null,
      seoDescription: input.seoDescription.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));
  return { ok: true };
}

export async function setCover(db: Db, id: number, cover: { src: string; width: number; height: number } | null) {
  const [previous] = await db.select({ src: posts.coverSrc }).from(posts).where(eq(posts.id, id));
  await db
    .update(posts)
    .set({ coverSrc: cover?.src ?? null, coverWidth: cover?.width ?? null, coverHeight: cover?.height ?? null, updatedAt: new Date() })
    .where(eq(posts.id, id));
  return previous?.src ?? null;
}

export async function deletePost(db: Db, id: number) {
  const [deleted] = await db.delete(posts).where(eq(posts.id, id)).returning({ coverSrc: posts.coverSrc });
  return deleted ?? null;
}
