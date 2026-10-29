import "server-only";

import { asc, eq, ne } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "./db";
import { retryLocalRead } from "./db/retry";
import { collections, productImages, products, variants, type ProductSection } from "./db/schema";
import type { SizeGuide } from "./sizing";

export type { ProductSection };

export type ProductImage = { src: string; width: number; height: number; alt: string };

export type Variant = {
  id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  available: boolean;
};

export type Product = {
  handle: string;
  // Drafts stay in the database but are never shown or sold. Belts are drafts until they launch.
  status: "active" | "draft" | "archived";
  title: string;
  collection: string;
  price: number;
  compareAtPrice: number | null;
  colour: string | null;
  tagline: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  intro: string[];
  sections: ProductSection[];
  variants: Variant[];
  sizeGuide: SizeGuide | null;
  images: ProductImage[];
  tags: string[];
};

export type Collection = { handle: string; title: string };

export type CollectionWithItems = Collection & { items: Product[] };

// The storefront-wide listing at /collections/all, kept from the Shopify URL shape.
const ALL: Collection = { handle: "all", title: "Shop all" };

// This is the only module that knows where the catalog lives (Cloudflare D1, through Drizzle).
// The live catalog is a dozen products, so each request loads it once and the functions below
// pick from it. Revisit when it grows past a few hundred.
const loadCatalog = cache(() => retryLocalRead(readCatalog));

async function readCatalog() {
  const db = await getDb();
  const [rows, hidden, collectionRows] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.status, "active"),
      orderBy: [asc(products.position), asc(products.id)],
      with: {
        variants: { orderBy: [asc(variants.position), asc(variants.id)] },
        images: { orderBy: [asc(productImages.position), asc(productImages.id)] },
      },
    }),
    db.select({ handle: products.handle, collection: products.collectionHandle }).from(products).where(ne(products.status, "active")),
    db.select({ handle: collections.handle, title: collections.title }).from(collections).orderBy(asc(collections.position)),
  ]);

  const live: Product[] = rows.map((row) => ({
    handle: row.handle,
    status: row.status,
    title: row.title,
    collection: row.collectionHandle,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    colour: row.colour,
    tagline: row.tagline,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    intro: row.intro,
    sections: row.sections,
    sizeGuide: row.sizeGuide,
    tags: row.tags,
    variants: row.variants.map((variant) => ({
      id: String(variant.id),
      sku: variant.sku,
      size: variant.size,
      colour: variant.colour,
      available: variant.stock > 0,
    })),
    images: row.images.map(({ src, width, height, alt }) => ({ src, width, height, alt })),
  }));

  return { live, hidden, collections: collectionRows };
}

function withItems(collection: Collection, live: Product[]): CollectionWithItems {
  const items = collection.handle === ALL.handle ? live : live.filter((product) => product.collection === collection.handle);
  return { ...collection, items };
}

export async function getProducts(): Promise<Product[]> {
  return (await loadCatalog()).live;
}

export async function getProduct(handle: string): Promise<Product | null> {
  return (await loadCatalog()).live.find((product) => product.handle === handle) ?? null;
}

// Collections with nothing live in them (belts, for now) are left out entirely.
export async function getCollections(): Promise<CollectionWithItems[]> {
  const { live, collections } = await loadCatalog();
  return collections.map((collection) => withItems(collection, live)).filter((collection) => collection.items.length > 0);
}

export async function getCollection(handle: string): Promise<CollectionWithItems | null> {
  const { live, collections } = await loadCatalog();
  const collection = handle === ALL.handle ? ALL : collections.find((candidate) => candidate.handle === handle);
  if (!collection) return null;
  const resolved = withItems(collection, live);
  return resolved.items.length > 0 ? resolved : null;
}

// Where to send someone following an old link (Shopify's, a post on Instagram) to a product that's
// hidden for now, like the belts: its collection while that has something on sale, else everything.
// Null for a handle the store never had, which stays a 404.
export async function hiddenProductRedirect(handle: string): Promise<string | null> {
  const { live, hidden } = await loadCatalog();
  const product = hidden.find((candidate) => candidate.handle === handle);
  if (!product) return null;
  return live.some((candidate) => candidate.collection === product.collection) ? `/collections/${product.collection}` : `/collections/${ALL.handle}`;
}

// The same for a collection with nothing on sale in it.
export async function emptyCollectionRedirect(handle: string): Promise<string | null> {
  const { live, collections } = await loadCatalog();
  const known = collections.some((collection) => collection.handle === handle);
  return known && !live.some((product) => product.collection === handle) ? `/collections/${ALL.handle}` : null;
}

export async function getRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  const { live } = await loadCatalog();
  const product = live.find((candidate) => candidate.handle === handle);
  if (!product) return [];
  const sameLine = live.filter((p) => p.collection === product.collection && p.handle !== handle);
  const others = live.filter((p) => p.collection !== product.collection);
  return [...sameLine, ...others].slice(0, limit);
}

export async function getVariant(id: string): Promise<{ product: Product; variant: Variant } | null> {
  for (const product of (await loadCatalog()).live) {
    const variant = product.variants.find((candidate) => candidate.id === id);
    if (variant) return { product, variant };
  }
  return null;
}
