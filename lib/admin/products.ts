import "server-only";

import { and, asc, eq, like, ne, sql } from "drizzle-orm";

import type { Db } from "../db";
import { collections, productImages, products, variants, type ProductSection } from "../db/schema";
import type { Result } from "./orders";

export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const fail = (message: string) => ({ ok: false as const, message });

// "Tan Cropped Suede Jacket!" becomes tan-cropped-suede-jacket: the product's address on the store.
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const skuFor = (handle: string, size: string | null) => `KLAEV-${handle.toUpperCase()}${size ? `-${size.toUpperCase().replace(/\s+/g, "")}` : ""}`;

async function uniqueHandle(db: Db, base: string) {
  const taken = new Set(
    (await db.select({ handle: products.handle }).from(products).where(like(products.handle, `${base}%`))).map((row) => row.handle),
  );
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix++) if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
}

const collectionExists = async (db: Db, handle: string) =>
  (await db.select({ handle: collections.handle }).from(collections).where(eq(collections.handle, handle))).length > 0;

const whole = (value: number) => Number.isSafeInteger(value) && value >= 0;

// Every product in shop order with its first photo, price and stock, for the products list.
export async function listProducts(db: Db, { status, query = "" }: { status?: ProductStatus; query?: string }) {
  return db
    .select({
      id: products.id,
      handle: products.handle,
      title: products.title,
      status: products.status,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      collection: collections.title,
      stock: sql<number>`(SELECT COALESCE(SUM(stock), 0) FROM variants WHERE variants.product_id = products.id)`,
      sizes: sql<number>`(SELECT COUNT(*) FROM variants WHERE variants.product_id = products.id)`,
      image: sql<string | null>`(SELECT src FROM product_images WHERE product_images.product_id = products.id ORDER BY position LIMIT 1)`,
    })
    .from(products)
    .innerJoin(collections, eq(collections.handle, products.collectionHandle))
    .where(and(status ? eq(products.status, status) : ne(products.status, "archived"), query.trim() ? like(products.title, `%${query.trim()}%`) : undefined))
    .orderBy(asc(products.position), asc(products.id));
}

export async function productCounts(db: Db) {
  const rows = await db.select({ status: products.status, count: sql<number>`COUNT(*)` }).from(products).groupBy(products.status);
  const count = (status: ProductStatus) => rows.find((row) => row.status === status)?.count ?? 0;
  return { all: count("active") + count("draft"), active: count("active"), draft: count("draft"), archived: count("archived") };
}

export async function getProductForEdit(db: Db, id: number) {
  if (!Number.isSafeInteger(id)) return null;
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      variants: { orderBy: (rows, { asc }) => [asc(rows.position), asc(rows.id)] },
      images: { orderBy: (rows, { asc }) => [asc(rows.position), asc(rows.id)] },
    },
  });
  return product ?? null;
}

export type EditableProduct = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;

export async function listCollections(db: Db) {
  return db.select({ handle: collections.handle, title: collections.title }).from(collections).orderBy(asc(collections.position));
}

// A new product: a title, where it lives, its price and its sizes. It starts as a draft with no
// stock, so photos, a description and stock can be added before it goes live.
export async function createProduct(
  db: Db,
  input: { title: string; collectionHandle: string; price: number; sizes: string[] },
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const title = input.title.trim();
  if (!title || title.length > 120) return fail("Give the product a title.");
  if (!Number.isSafeInteger(input.price) || input.price <= 0) return fail("The price is a whole number of rupees.");
  if (!(await collectionExists(db, input.collectionHandle))) return fail("Choose a collection.");
  const sizes = [...new Set(input.sizes.map((size) => size.trim().toUpperCase()).filter(Boolean))];
  const base = slugify(title);
  if (!base) return fail("The title needs at least one letter or number.");
  const handle = await uniqueHandle(db, base);

  const [created] = await db
    .insert(products)
    .values({
      handle,
      title,
      collectionHandle: input.collectionHandle,
      price: input.price,
      status: "draft",
      position: sql`(SELECT COALESCE(MAX(position), 0) + 1 FROM products)`,
    })
    .returning({ id: products.id });
  const rows = (sizes.length ? sizes : [null]).map((size, position) => ({ productId: created.id, size, sku: skuFor(handle, size), position }));
  await db.insert(variants).values(rows);
  return { ok: true, id: created.id };
}

export type ProductInput = {
  title: string;
  tagline: string;
  colour: string;
  collectionHandle: string;
  status: ProductStatus;
  tags: string;
  intro: string;
  sections: ProductSection[];
  seoTitle: string;
  seoDescription: string;
  price: number;
  compareAtPrice: number | null;
};

// Everything on the product's page in one save: what it is, how it's described, where it lives,
// what it costs, how search engines show it, and whether it's on the store.
export async function saveProduct(db: Db, id: number, input: ProductInput): Promise<Result> {
  const title = input.title.trim();
  if (!title || title.length > 120) return fail("Give the product a title.");
  if (!PRODUCT_STATUSES.includes(input.status)) return fail("Choose a status.");
  if (!Number.isSafeInteger(input.price) || input.price <= 0) return fail("The price is a whole number of rupees.");
  if (input.compareAtPrice !== null && !(Number.isSafeInteger(input.compareAtPrice) && input.compareAtPrice > input.price)) {
    return fail("The compare-at price is the old, higher price. Leave it empty if the product isn't on sale.");
  }
  if (!(await collectionExists(db, input.collectionHandle))) return fail("Choose a collection.");
  if (input.seoTitle.trim().length > 70) return fail("Keep the search title to 70 characters; search engines cut the rest.");
  if (input.seoDescription.trim().length > 320) return fail("Keep the search description to 320 characters.");

  const product = await getProductForEdit(db, id);
  if (!product) return fail("That product isn't there any more.");
  if (input.status === "active" && product.images.length === 0) return fail("Add a photo before putting it on the store.");
  if (input.status === "active" && product.variants.length === 0) return fail("Add a size before putting it on the store.");

  const sections = input.sections
    .map((section) => ({
      heading: section.heading.trim(),
      items: section.items.filter((item) => item.text.trim()).map((item) => ({ title: item.title?.trim() || null, text: item.text.trim() })),
      paragraphs: section.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
    }))
    .filter((section) => section.heading && (section.items.length || section.paragraphs.length));

  await db
    .update(products)
    .set({
      title,
      tagline: input.tagline.trim() || null,
      colour: input.colour.trim() || null,
      collectionHandle: input.collectionHandle,
      status: input.status,
      tags: input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      intro: input.intro
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      sections,
      seoTitle: input.seoTitle.trim() || null,
      seoDescription: input.seoDescription.trim() || null,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      // The first time it goes live.
      publishedAt: input.status === "active" ? (product.publishedAt ?? new Date()) : product.publishedAt,
    })
    .where(eq(products.id, id));
  return { ok: true };
}

async function skuTaken(db: Db, sku: string, except?: number) {
  const rows = await db.select({ id: variants.id }).from(variants).where(eq(variants.sku, sku));
  return rows.some((row) => row.id !== except);
}

// A new size for a product, with no stock until it's restocked.
export async function addVariant(db: Db, productId: number, input: { size: string; sku: string; costPrice: number | null }): Promise<Result> {
  const product = await getProductForEdit(db, productId);
  if (!product) return fail("That product isn't there any more.");
  const size = input.size.trim().toUpperCase();
  if (!size || size.length > 12) return fail("Name the size, like M or XL.");
  if (product.variants.some((variant) => variant.size?.toUpperCase() === size)) return fail(`It already has size ${size}.`);
  const sku = input.sku.trim().toUpperCase() || skuFor(product.handle, size);
  if (await skuTaken(db, sku)) return fail(`${sku} is already another size's SKU.`);
  if (input.costPrice !== null && !whole(input.costPrice)) return fail("The cost is a whole number of rupees.");
  await db.insert(variants).values({
    productId,
    size,
    sku,
    costPrice: input.costPrice,
    position: sql`(SELECT COALESCE(MAX(position), -1) + 1 FROM variants WHERE product_id = ${productId})`,
  });
  return { ok: true };
}

export async function saveVariant(db: Db, variantId: number, input: { size: string; sku: string; costPrice: number | null }): Promise<Result> {
  const [variant] = await db.select({ id: variants.id, productId: variants.productId }).from(variants).where(eq(variants.id, variantId));
  if (!variant) return fail("That size isn't there any more.");
  const size = input.size.trim().toUpperCase();
  if (!size) return fail("Name the size, like M or XL.");
  const sku = input.sku.trim().toUpperCase();
  if (!sku) return fail("Give it a SKU.");
  if (await skuTaken(db, sku, variantId)) return fail(`${sku} is already another size's SKU.`);
  if (input.costPrice !== null && !whole(input.costPrice)) return fail("The cost is a whole number of rupees.");
  const sameSize = await db
    .select({ id: variants.id })
    .from(variants)
    .where(and(eq(variants.productId, variant.productId), sql`upper(${variants.size}) = ${size}`, ne(variants.id, variantId)));
  if (sameSize.length) return fail(`It already has size ${size}.`);
  await db.update(variants).set({ size, sku, costPrice: input.costPrice }).where(eq(variants.id, variantId));
  return { ok: true };
}

// Photos are stored by the upload action (app/actions/admin-media.ts); these keep their rows in order.
export async function addProductImage(db: Db, productId: number, image: { src: string; width: number; height: number; alt: string }) {
  await db.insert(productImages).values({
    productId,
    ...image,
    position: sql`(SELECT COALESCE(MAX(position), -1) + 1 FROM product_images WHERE product_id = ${productId})`,
  });
}

export async function saveImageAlt(db: Db, imageId: number, alt: string): Promise<Result> {
  const text = alt.trim();
  if (!text) return fail("Describe the photo for people who can't see it.");
  await db.update(productImages).set({ alt: text.slice(0, 200) }).where(eq(productImages.id, imageId));
  return { ok: true };
}

// Moves a photo one place earlier or later; the first photo is the one the store shows first.
export async function moveImage(db: Db, imageId: number, direction: -1 | 1): Promise<Result> {
  const [image] = await db.select().from(productImages).where(eq(productImages.id, imageId));
  if (!image) return fail("That photo isn't there any more.");
  const siblings = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, image.productId))
    .orderBy(asc(productImages.position), asc(productImages.id));
  const index = siblings.findIndex((sibling) => sibling.id === imageId);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) return { ok: true };
  const order = siblings.map((sibling) => sibling.id);
  [order[index], order[target]] = [order[target], order[index]];
  const [first, ...rest] = order.map((id, position) => db.update(productImages).set({ position }).where(eq(productImages.id, id)));
  await db.batch([first, ...rest]);
  return { ok: true };
}

export async function deleteImage(db: Db, imageId: number) {
  const [image] = await db.delete(productImages).where(eq(productImages.id, imageId)).returning();
  return image ?? null;
}

