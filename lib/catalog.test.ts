// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import {
  emptyCollectionRedirect,
  getCollection,
  getCollections,
  getProduct,
  getProducts,
  getRelatedProducts,
  getVariant,
  hiddenProductRedirect,
} from "./catalog";
import type { Db } from "./db";
import { createTestDb } from "./db/test-db";

const testDb = vi.hoisted(() => ({ current: undefined as Db | undefined }));
vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: async () => testDb.current,
}));

let store: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
  testDb.current = store.db;
}, 60_000);

afterAll(() => store?.dispose());

const live = snapshot.products.filter((product) => product.status === "active");

describe("the catalog, read from D1", () => {
  test("lists live products in catalog order, with drafts left out", async () => {
    const products = await getProducts();
    expect(products.map((product) => product.handle)).toEqual(live.map((product) => product.handle));
    expect(products.every((product) => product.status === "active")).toBe(true);
  });

  test("a product comes back whole: copy, sizes, size guide, photos in order", async () => {
    const product = await getProduct("dark-brown-cropped-sheepskin-leather-jacket");
    const seed = live[0];

    expect(product).toMatchObject({
      title: seed.title,
      collection: "cropped-leather-jackets",
      price: 17999,
      compareAtPrice: null,
      tagline: seed.tagline,
      intro: seed.intro,
      sections: seed.sections,
      sizeGuide: seed.sizeGuide,
      tags: seed.tags,
      seoTitle: "Men’s Dark Brown Cropped Leather Jacket | Klaev Pakistan",
    });
    expect(product?.images).toEqual(seed.images);
    expect(product?.variants.map((variant) => [variant.id, variant.size, variant.available])).toEqual([
      ["49253873647687", "S", true],
      ["49253873680455", "M", true],
      ["49253873713223", "L", true],
      ["49253873745991", "XL", false],
    ]);
  });

  test("a size with no stock left reads as sold out", async () => {
    await store.run(["UPDATE variants SET stock = 0 WHERE sku = 'KLAEV-CROP-DBRN-M'"]);
    const product = await getProduct("dark-brown-cropped-sheepskin-leather-jacket");
    expect(product?.variants.find((variant) => variant.size === "M")?.available).toBe(false);
    await store.run(["UPDATE variants SET stock = 1 WHERE sku = 'KLAEV-CROP-DBRN-M'"]);
  });

  test("drafts and unknown handles are not found", async () => {
    expect(await getProduct("black-stitched-leather-belt")).toBeNull();
    expect(await getProduct("no-such-jacket")).toBeNull();
  });

  test("collections skip any with nothing live in them", async () => {
    const collections = await getCollections();
    expect(collections.map((collection) => [collection.handle, collection.items.length])).toEqual([
      ["cropped-leather-jackets", 3],
      ["suede-jackets", 1],
      ["leather-jackets", 2],
    ]);
    expect(await getCollection("leather-belts")).toBeNull();
    expect(await getCollection("no-such-collection")).toBeNull();
  });

  test("a hidden product or empty collection sends its visitors to what's on sale; unknown handles go nowhere", async () => {
    expect(await hiddenProductRedirect("black-studded-leather-belt")).toBe("/collections/all");
    expect(await emptyCollectionRedirect("leather-belts")).toBe("/collections/all");

    await store.run(["UPDATE products SET status = 'archived' WHERE handle = 'black-cropped-leather-jacket'"]);
    expect(await hiddenProductRedirect("black-cropped-leather-jacket")).toBe("/collections/cropped-leather-jackets");
    await store.run(["UPDATE products SET status = 'active' WHERE handle = 'black-cropped-leather-jacket'"]);

    expect(await hiddenProductRedirect("black-cropped-leather-jacket")).toBeNull();
    expect(await hiddenProductRedirect("no-such-jacket")).toBeNull();
    expect(await emptyCollectionRedirect("cropped-leather-jackets")).toBeNull();
    expect(await emptyCollectionRedirect("all")).toBeNull();
    expect(await emptyCollectionRedirect("no-such-collection")).toBeNull();
  });

  test("'all' is every live product", async () => {
    const all = await getCollection("all");
    expect(all?.title).toBe("Shop all");
    expect(all?.items).toHaveLength(live.length);
  });

  test("related products put the same line first", async () => {
    const related = await getRelatedProducts("burgundy-cropped-leather-jacket");
    expect(related.map((product) => product.handle)).toEqual([
      "dark-brown-cropped-sheepskin-leather-jacket",
      "black-cropped-leather-jacket",
      "black-suede-jacket",
      "oxblood-lambskin-leather-jacket",
    ]);
  });

  test("a variant id finds its product, but never a draft's", async () => {
    const found = await getVariant("42204090892359");
    expect(found?.product.handle).toBe("black-lambskin-leather-jacket");
    expect(found?.variant).toMatchObject({ sku: "LTHR-BLK-M", size: "M", available: true });

    expect(await getVariant("42606810529863")).toBeNull();
    expect(await getVariant("1")).toBeNull();
    expect(await getVariant("not-a-number")).toBeNull();
  });
});
