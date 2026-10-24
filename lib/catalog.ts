import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import snapshot from "@/data/catalog.json";

import type { SizeGuide } from "./sizing";

export type ProductImage = { src: string; width: number; height: number; alt: string };

export type Variant = {
  id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  available: boolean;
};

export type ProductSection = {
  heading: string;
  items: { title: string | null; text: string }[];
  paragraphs: string[];
};

export type Product = {
  handle: string;
  // Drafts are kept in the catalog but never shown or sold. Belts are drafts until they launch.
  status: "active" | "draft";
  title: string;
  collection: string;
  price: number;
  compareAtPrice: number | null;
  colour: string | null;
  tagline: string | null;
  intro: string[];
  sections: ProductSection[];
  variants: Variant[];
  sizeGuide: SizeGuide | null;
  images: ProductImage[];
  tags: string[];
};

export type Collection = { handle: string; title: string; products: string[] };

export type CollectionWithItems = Collection & { items: Product[] };

// The storefront-wide listing at /collections/all, kept from the Shopify URL shape.
const ALL: Collection = { handle: "all", title: "Shop all", products: [] };

type Catalog = { collections: Collection[]; products: Product[] };

// This is the only module that knows the catalog is a JSON snapshot.
// Swapping in Cloudflare D1 means rewriting these functions, nothing else.
const catalog = snapshot as Catalog;
const live = catalog.products.filter((product) => product.status === "active");

function withItems(collection: Collection): CollectionWithItems {
  const items =
    collection.handle === ALL.handle
      ? live
      : collection.products
          .map((handle) => live.find((product) => product.handle === handle))
          .filter((product): product is Product => product !== undefined);
  return { ...collection, items };
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog");
  return live;
}

export async function getProduct(handle: string): Promise<Product | null> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog", `product:${handle}`);
  return live.find((product) => product.handle === handle) ?? null;
}

// Collections with nothing live in them (belts, for now) are left out entirely.
export async function getCollections(): Promise<CollectionWithItems[]> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog");
  return catalog.collections.map(withItems).filter((collection) => collection.items.length > 0);
}

export async function getCollection(handle: string): Promise<CollectionWithItems | null> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog", `collection:${handle}`);
  const collection = handle === ALL.handle ? ALL : catalog.collections.find((c) => c.handle === handle);
  if (!collection) return null;
  const resolved = withItems(collection);
  return resolved.items.length > 0 ? resolved : null;
}

export async function getRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog");
  const product = live.find((candidate) => candidate.handle === handle);
  if (!product) return [];
  const sameLine = live.filter((p) => p.collection === product.collection && p.handle !== handle);
  const others = live.filter((p) => p.collection !== product.collection);
  return [...sameLine, ...others].slice(0, limit);
}

export async function getVariant(id: string): Promise<{ product: Product; variant: Variant } | null> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog");
  for (const product of live) {
    const variant = product.variants.find((candidate) => candidate.id === id);
    if (variant) return { product, variant };
  }
  return null;
}
