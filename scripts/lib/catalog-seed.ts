import type { ProductSection } from "../../lib/db/schema";
import type { SizeGuide } from "../../lib/sizing";

import { insert, literal } from "./sql";

// The shape of data/catalog.json, the seed for local development and CI.
export type CatalogSnapshot = {
  collections: { handle: string; title: string }[];
  products: {
    handle: string;
    status: string;
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
    variants: { id: string; sku: string; size: string | null; colour: string | null; stock: number }[];
    sizeGuide: SizeGuide | null | Record<string, unknown>;
    images: { src: string; width: number; height: number; alt: string }[];
    tags: string[];
    publishedAt: string | null;
  }[];
};

// Replaces the catalog with the snapshot. Products get ids in snapshot order and variants keep their
// Shopify ids. Orders survive: their lines lose the variant link but keep the copied details.
// Run it against the real database only to load it the first time; after that the database is the truth.
export function catalogSeedStatements(snapshot: CatalogSnapshot): string[] {
  const statements = [
    "DELETE FROM product_images",
    "DELETE FROM variants",
    "DELETE FROM products",
    "DELETE FROM collections",
  ];

  snapshot.collections.forEach((collection, position) => {
    statements.push(insert("collections", { handle: collection.handle, title: collection.title, position }));
  });

  snapshot.products.forEach((product, index) => {
    const id = index + 1;
    statements.push(
      insert("products", {
        id,
        handle: product.handle,
        status: product.status,
        title: product.title,
        collection_handle: product.collection,
        price: product.price,
        compare_at_price: product.compareAtPrice || null,
        colour: product.colour,
        tagline: product.tagline,
        intro: product.intro,
        sections: product.sections,
        size_guide: product.sizeGuide,
        tags: product.tags,
        seo_title: product.seoTitle,
        seo_description: product.seoDescription,
        position: index,
        published_at: product.publishedAt ? new Date(product.publishedAt) : null,
      }),
    );
    product.variants.forEach((variant, position) => {
      statements.push(
        insert("variants", {
          id: Number(variant.id),
          product_id: id,
          sku: variant.sku,
          size: variant.size,
          colour: variant.colour,
          position,
          stock: variant.stock,
        }),
      );
    });
    product.images.forEach((image, position) => {
      statements.push(insert("product_images", { product_id: id, position, ...image }));
    });
  });

  return statements;
}

// Store settings for local development and CI. The real database holds the real bank account,
// which never goes in this public repository.
export const DEV_SETTINGS = {
  bank: { bank: "Example Bank", accountTitle: "Klaev Test", accountNumber: "00001234567890" },
};

export function devSettingsStatements(): string[] {
  return Object.entries(DEV_SETTINGS).map(
    ([key, value]) =>
      `INSERT INTO settings (key, value) VALUES (${literal(key)}, ${literal(value)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
}
