import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { cache } from "react";

import { getDb, type Db } from "./db";
import { retryLocalRead } from "./db/retry";
import { orders, products, reviews, REVIEW_SOURCES, REVIEW_STATUSES } from "./db/schema";
import { homeSelection, photosFirst, poolOf, ratingSummary, validateReview } from "./review-rules";

export type Photo = { src: string; width: number; height: number };
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

const TOKEN = /^[A-Za-z0-9_-]{20,40}$/;

const photoOf = (src: string | null, width: number | null, height: number | null): Photo | null =>
  src && width && height ? { src, width, height } : null;

// An order's lines as reviews see them: each product once, with its review if it has one. Lines whose
// jacket has since been deleted from the catalog are left out.
async function orderItems(db: Db, where: ReturnType<typeof eq>) {
  const order = await db.query.orders.findFirst({
    where,
    columns: { id: true, number: true, name: true, city: true, status: true, source: true, token: true, exchangeOf: true },
    with: {
      lines: {
        columns: { id: true, title: true, size: true },
        orderBy: (lines, { asc }) => asc(lines.id),
        with: {
          variant: {
            columns: { productId: true },
            with: {
              product: {
                columns: { handle: true, colour: true },
                with: { images: { columns: { src: true, width: true, height: true }, orderBy: (images, { asc }) => asc(images.position), limit: 1 } },
              },
            },
          },
        },
      },
    },
  });
  if (!order) return null;
  const kept = await keptSizes(db, order.id);
  const written = await db
    .select({ id: reviews.id, orderLineId: reviews.orderLineId, productId: reviews.productId })
    .from(reviews)
    .where(eq(reviews.orderId, order.id));
  const seen = new Set<number>();
  const items = order.lines.flatMap((line) => {
    const productId = line.variant?.productId;
    if (!productId || seen.has(productId)) return [];
    seen.add(productId);
    return [
      {
        lineId: line.id,
        productId,
        title: line.title,
        size: kept.get(productId) ?? line.size,
        colour: line.variant!.product.colour,
        image: line.variant!.product.images[0] ?? null,
        reviewId: written.find((review) => review.productId === productId)?.id ?? null,
      },
    ];
  });
  // A delivered order can be reviewed. An exchange is reviewed through the order it replaced, the
  // first of an exchange of an exchange: `replaces` is that order's number.
  const open = order.status === "delivered" && order.source !== "exchange";
  const replaces = await firstOrder(db, order.exchangeOf);
  return { id: order.id, number: order.number, name: order.name, city: order.city, token: order.token, open, replaces, items };
}

// The number of the order an exchange started from, following an exchange of an exchange back.
async function firstOrder(db: Db, id: number | null) {
  for (let hops = 0; id !== null && hops < 5; hops++) {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id), columns: { number: true, exchangeOf: true } });
    if (!order) return null;
    if (order.exchangeOf === null) return order.number;
    id = order.exchangeOf;
  }
  return null;
}

// A jacket swapped for another size is reviewed in the size they kept: each delivered exchange's size,
// by jacket, following an exchange of an exchange to the last one.
async function keptSizes(db: Db, orderId: number) {
  const sizes = new Map<number, string | null>();
  let from = orderId;
  for (let hops = 0; hops < 5; hops++) {
    const exchange = await db.query.orders.findFirst({
      where: and(eq(orders.exchangeOf, from), eq(orders.status, "delivered")),
      orderBy: desc(orders.id),
      columns: { id: true },
      with: { lines: { columns: { size: true }, with: { variant: { columns: { productId: true } } } } },
    });
    if (!exchange) break;
    for (const line of exchange.lines) if (line.variant) sizes.set(line.variant.productId, line.size);
    from = exchange.id;
  }
  return sizes;
}

export type ReviewableOrder = NonNullable<Awaited<ReturnType<typeof orderItems>>>;

// The review page behind a delivered order's private link.
export async function reviewableOrder(db: Db, token: string) {
  if (!TOKEN.test(token)) return null;
  return orderItems(db, eq(orders.token, token));
}

export async function reviewableOrderByNumber(db: Db, number: number) {
  if (!Number.isSafeInteger(number)) return null;
  return orderItems(db, eq(orders.number, number));
}

// Whether an order still has something to review, for its page's prompt and the WhatsApp ask.
export const awaitsReview = (order: ReviewableOrder) => order.open && order.items.some((item) => item.reviewId === null);

type Written = { rating: string; body: string; name: string };
type Saved = { ok: true; id: number } | { ok: false; field?: "rating" | "body" | "name"; message: string };

async function insertReview(
  db: Db,
  order: ReviewableOrder,
  lineId: number,
  input: Written,
  extra: { source: ReviewSource; status: ReviewStatus },
): Promise<Saved> {
  const valid = validateReview(input);
  if (!valid.ok) return valid;
  if (!order.open) return { ok: false, message: "Reviews open once the order is delivered." };
  const item = order.items.find((candidate) => candidate.lineId === lineId);
  if (!item) return { ok: false, message: "That isn't in this order." };
  if (item.reviewId !== null) return { ok: false, message: "This one has a review already. Thank you." };
  try {
    const [row] = await db
      .insert(reviews)
      .values({
        ...valid.value,
        productId: item.productId,
        orderId: order.id,
        orderLineId: item.lineId,
        city: order.city,
        size: item.size,
        ...extra,
        publishedAt: extra.status === "published" ? new Date() : null,
      })
      .returning({ id: reviews.id });
    return { ok: true, id: row.id };
  } catch (error) {
    // Two taps at once: the second runs into the one-review-per-line rule.
    if (String(error).includes("UNIQUE")) return { ok: false, message: "This one has a review already. Thank you." };
    throw error;
  }
}

// A review written through the order's link. It waits for Klaev to publish it.
export async function submitReview(db: Db, token: string, lineId: number, input: Written): Promise<Saved> {
  const order = await reviewableOrder(db, token);
  if (!order) return { ok: false, message: "That order link isn't right." };
  return insertReview(db, order, lineId, input, { source: "site", status: "pending" });
}

// A review Klaev types in from WhatsApp or Instagram, with the customer's say-so. It's live at once.
export async function addReview(db: Db, number: number, lineId: number, input: Written & { source: string }): Promise<Saved> {
  const order = await reviewableOrderByNumber(db, number);
  if (!order) return { ok: false, message: `There's no order #${number}.` };
  const source = REVIEW_SOURCES.find((candidate) => candidate === input.source) ?? "whatsapp";
  return insertReview(db, order, lineId, input, { source, status: "published" });
}

// The photo a customer adds to the review they just wrote, while it still waits to be published.
export async function addCustomerPhoto(db: Db, token: string, reviewId: number, photo: Photo) {
  if (!TOKEN.test(token)) return false;
  const updated = await db
    .update(reviews)
    .set({ photoSrc: photo.src, photoWidth: photo.width, photoHeight: photo.height })
    .where(
      and(
        eq(reviews.id, reviewId),
        eq(reviews.status, "pending"),
        isNull(reviews.photoSrc),
        eq(reviews.orderId, sql`(SELECT id FROM orders WHERE token = ${token})`),
      ),
    )
    .returning({ id: reviews.id });
  return updated.length > 0;
}

// The admin's list for one tab, newest first.
export async function listReviews(db: Db, status: ReviewStatus) {
  const rows = await db
    .select({
      review: reviews,
      productTitle: products.title,
      productHandle: products.handle,
      orderNumber: orders.number,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .leftJoin(orders, eq(orders.id, reviews.orderId))
    .where(eq(reviews.status, status))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(300);
  return rows.map(({ review, ...rest }) => ({
    ...review,
    ...rest,
    photo: photoOf(review.photoSrc, review.photoWidth, review.photoHeight),
    screenshot: photoOf(review.screenshotSrc, review.screenshotWidth, review.screenshotHeight),
  }));
}

export type AdminReview = Awaited<ReturnType<typeof listReviews>>[number];

export async function reviewCounts(db: Db) {
  const rows = await db.select({ status: reviews.status, count: sql<number>`COUNT(*)` }).from(reviews).groupBy(reviews.status);
  const counts: Record<ReviewStatus, number> = { pending: 0, published: 0, hidden: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

// Publishing stamps the first time it went live; hiding also takes it off the home page.
export async function setReviewStatus(db: Db, id: number, status: ReviewStatus) {
  const [row] = await db
    .update(reviews)
    .set({
      status,
      ...(status === "published" ? { publishedAt: sql`COALESCE(${reviews.publishedAt}, unixepoch())` } : {}),
      ...(status !== "published" ? { featured: false } : {}),
    })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id });
  return Boolean(row);
}

export async function saveReply(db: Db, id: number, reply: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = reply.trim();
  if (text.length > 600) return { ok: false, message: "Keep the reply under 600 characters." };
  await db.update(reviews).set({ reply: text || null }).where(eq(reviews.id, id));
  return { ok: true };
}

export async function setFeatured(db: Db, id: number, featured: boolean) {
  const [row] = await db
    .update(reviews)
    .set({ featured })
    .where(and(eq(reviews.id, id), eq(reviews.status, "published")))
    .returning({ id: reviews.id });
  return Boolean(row);
}

// Sets or clears a review's photo or screenshot, and returns the one it replaced so it can be deleted.
export async function setReviewImage(db: Db, id: number, which: "photo" | "screenshot", photo: Photo | null) {
  const [before] = await db
    .select({ photo: reviews.photoSrc, screenshot: reviews.screenshotSrc })
    .from(reviews)
    .where(eq(reviews.id, id));
  if (!before) return { found: false as const };
  const values =
    which === "photo"
      ? { photoSrc: photo?.src ?? null, photoWidth: photo?.width ?? null, photoHeight: photo?.height ?? null }
      : { screenshotSrc: photo?.src ?? null, screenshotWidth: photo?.width ?? null, screenshotHeight: photo?.height ?? null };
  await db.update(reviews).set(values).where(eq(reviews.id, id));
  return { found: true as const, previous: before[which] };
}

export async function pendingReviews(db: Db) {
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.status, "pending"));
  return row.count;
}

// The store reads published reviews once per request, like the catalog (lib/catalog.ts), and picks
// from them. Only reviews of products on sale show.
const loadPublished = cache(() => retryLocalRead(async () => readPublished(await getDb())));

export async function readPublished(db: Db) {
  const rows = await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      rating: reviews.rating,
      body: reviews.body,
      name: reviews.name,
      city: reviews.city,
      size: reviews.size,
      source: reviews.source,
      reply: reviews.reply,
      featured: reviews.featured,
      photoSrc: reviews.photoSrc,
      photoWidth: reviews.photoWidth,
      photoHeight: reviews.photoHeight,
      screenshotSrc: reviews.screenshotSrc,
      screenshotWidth: reviews.screenshotWidth,
      screenshotHeight: reviews.screenshotHeight,
      publishedAt: reviews.publishedAt,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(and(eq(reviews.status, "published"), eq(products.status, "active")))
    .orderBy(desc(reviews.publishedAt), desc(reviews.id));
  const ids = [...new Set(rows.map((row) => row.productId))];
  const reviewed = ids.length
    ? await db.query.products.findMany({
        where: inArray(products.id, ids),
        columns: { id: true, handle: true, title: true, colour: true, collectionHandle: true, sizeGuide: true },
        with: { images: { columns: { src: true, width: true, height: true }, orderBy: (images) => asc(images.position), limit: 1 } },
      })
    : [];
  return rows.flatMap((row) => {
    const product = reviewed.find((candidate) => candidate.id === row.productId);
    if (!product) return [];
    return [
      {
        id: row.id,
        rating: row.rating,
        body: row.body,
        name: row.name,
        city: row.city,
        size: row.size,
        source: row.source,
        reply: row.reply,
        featured: row.featured,
        photo: photoOf(row.photoSrc, row.photoWidth, row.photoHeight),
        screenshot: photoOf(row.screenshotSrc, row.screenshotWidth, row.screenshotHeight),
        product: {
          handle: product.handle,
          title: product.title,
          colour: product.colour,
          pool: poolOf({ handle: product.handle, collection: product.collectionHandle, sizeGuide: product.sizeGuide }),
          // The swatch is cut from the flat-lay, the product's first photo, as in the home page's picker.
          swatch: product.images[0] ?? null,
        },
      },
    ];
  });
}

export type StoreReview = Awaited<ReturnType<typeof readPublished>>[number];

// A product page's reviews: the line's, this colour's first, and photos first within each. The
// summary counts them all; the product's own are kept apart for search, which wants a product's
// reviews to be its own.
export function productReviews(all: StoreReview[], product: { handle: string; collection: string; sizeGuide: unknown }) {
  const pool = poolOf(product);
  const line = all.filter((review) => review.product.pool === pool);
  const own = line.filter((review) => review.product.handle === product.handle);
  const ordered = [...photosFirst(own), ...photosFirst(line.filter((review) => review.product.handle !== product.handle))];
  return {
    reviews: ordered,
    own,
    summary: ratingSummary(line.map((review) => review.rating)),
    allColours: line.some((review) => review.product.handle !== product.handle),
  };
}

export type ProductReviews = ReturnType<typeof productReviews>;

export async function getProductReviews(product: { handle: string; collection: string; sizeGuide: unknown }) {
  return productReviews(await loadPublished(), product);
}

// The rating a product card shows: the same summary as the product's own page (its line's
// reviews), by handle, or nothing when the line has none yet.
export async function getRatings(products: { handle: string; collection: string; sizeGuide: unknown }[]) {
  const all = await loadPublished();
  return Object.fromEntries(products.map((product) => [product.handle, productReviews(all, product).summary]));
}

// The home page chapter: the lead, then the other cards with photos first.
export function homeReviews(all: StoreReview[]) {
  const selection = homeSelection(all);
  return selection ? { lead: selection.lead, rest: photosFirst(selection.rest) } : null;
}

export async function getHomeReviews() {
  return homeReviews(await loadPublished());
}
