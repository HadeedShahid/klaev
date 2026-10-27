// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "../db/test-db";
import { productImages, products } from "../db/schema";
import { addVariant, createProduct, getProductForEdit, listProducts, productCounts, saveProduct, saveVariant, slugify } from "./products";

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);
afterAll(() => store?.dispose());

const details = {
  title: "Tan Cropped Suede Jacket",
  tagline: "Soft suede, cut to the waist.",
  colour: "Tan",
  collectionHandle: "cropped-leather-jackets",
  status: "draft" as const,
  tags: "suede, cropped",
  intro: "First paragraph.\n\nSecond paragraph.",
  sections: [{ heading: "Key features", items: [{ title: "Suede", text: "Goatskin suede." }], paragraphs: [] }],
  seoTitle: "Tan Cropped Suede Jacket | Klaev",
  seoDescription: "A tan suede jacket cut to the waist.",
  price: 18999,
  compareAtPrice: null as number | null,
};

describe("products", () => {
  test("handles are made from titles, and stay unique", () => {
    expect(slugify("Tan Cropped Suede Jacket!")).toBe("tan-cropped-suede-jacket");
    expect(slugify("  Two  spaces & a symbol ")).toBe("two-spaces-a-symbol");
  });

  test("a new product starts as a draft with its sizes, their SKUs and no stock", async () => {
    const result = await createProduct(store.db, { title: "Tan Cropped Suede Jacket", collectionHandle: "cropped-leather-jackets", price: 18999, sizes: ["S", "M", "L"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const product = (await getProductForEdit(store.db, result.id))!;
    expect(product).toMatchObject({ handle: "tan-cropped-suede-jacket", status: "draft", price: 18999 });
    expect(product.variants.map((variant) => [variant.size, variant.sku, variant.stock])).toEqual([
      ["S", "KLAEV-TAN-CROPPED-SUEDE-JACKET-S", 0],
      ["M", "KLAEV-TAN-CROPPED-SUEDE-JACKET-M", 0],
      ["L", "KLAEV-TAN-CROPPED-SUEDE-JACKET-L", 0],
    ]);

    // The same title again gets its own handle.
    const again = await createProduct(store.db, { title: "Tan Cropped Suede Jacket", collectionHandle: "cropped-leather-jackets", price: 18999, sizes: ["M"] });
    expect(again.ok && (await getProductForEdit(store.db, again.id))?.handle).toBe("tan-cropped-suede-jacket-2");

    expect(await createProduct(store.db, { title: "", collectionHandle: "cropped-leather-jackets", price: 18999, sizes: ["M"] })).toMatchObject({ ok: false });
    expect(await createProduct(store.db, { title: "X", collectionHandle: "no-such-collection", price: 18999, sizes: ["M"] })).toMatchObject({ ok: false });
  });

  test("saving keeps every field; a sale price must be above the price; going live needs a photo", async () => {
    const created = await createProduct(store.db, { title: "Tan Cropped Suede Jacket", collectionHandle: "cropped-leather-jackets", price: 18999, sizes: ["M"] });
    if (!created.ok) throw new Error("not created");
    const { id } = created;

    expect(await saveProduct(store.db, id, { ...details, compareAtPrice: 18000 })).toMatchObject({ ok: false });
    expect(await saveProduct(store.db, id, { ...details, title: " " })).toMatchObject({ ok: false });
    expect(await saveProduct(store.db, id, { ...details, status: "active" })).toMatchObject({ ok: false });

    expect(await saveProduct(store.db, id, { ...details, compareAtPrice: 21999 })).toEqual({ ok: true });
    expect(await getProductForEdit(store.db, id)).toMatchObject({
      title: "Tan Cropped Suede Jacket",
      colour: "Tan",
      tags: ["suede", "cropped"],
      intro: ["First paragraph.", "Second paragraph."],
      sections: details.sections,
      seoTitle: "Tan Cropped Suede Jacket | Klaev",
      price: 18999,
      compareAtPrice: 21999,
    });

    await store.db.insert(productImages).values({ productId: id, position: 0, src: "https://example.com/a.webp", width: 2560, height: 3200, alt: "Front" });
    expect(await saveProduct(store.db, id, { ...details, status: "active" })).toEqual({ ok: true });
    const [row] = await store.db.select({ status: products.status, publishedAt: products.publishedAt }).from(products).where(eq(products.id, id));
    expect(row.status).toBe("active");
    expect(row.publishedAt).toBeInstanceOf(Date);
  });

  test("sizes can be added and their SKU and cost changed; SKUs and sizes stay unique", async () => {
    const created = await createProduct(store.db, { title: "Tan Cropped Suede Jacket", collectionHandle: "cropped-leather-jackets", price: 18999, sizes: ["M"] });
    if (!created.ok) throw new Error("not created");
    const product = (await getProductForEdit(store.db, created.id))!;

    expect(await addVariant(store.db, created.id, { size: "M", sku: "X-1", costPrice: null })).toMatchObject({ ok: false });
    expect(await addVariant(store.db, created.id, { size: "XL", sku: "KLAEV-TAN-CROPPED-SUEDE-JACKET-M", costPrice: null })).toMatchObject({ ok: false });
    expect(await addVariant(store.db, created.id, { size: "XL", sku: "", costPrice: 9500 })).toEqual({ ok: true });
    expect(await saveVariant(store.db, product.variants[0].id, { size: "M", sku: "TAN-M", costPrice: 9000 })).toEqual({ ok: true });
    expect(await saveVariant(store.db, product.variants[0].id, { size: "M", sku: "TAN-M", costPrice: -1 })).toMatchObject({ ok: false });

    const after = (await getProductForEdit(store.db, created.id))!;
    expect(after.variants.map((variant) => [variant.size, variant.sku, variant.costPrice])).toEqual([
      ["M", "TAN-M", 9000],
      ["XL", "KLAEV-TAN-CROPPED-SUEDE-JACKET-XL", 9500],
    ]);
  });

  test("the list filters by status and finds by title", async () => {
    const created = await createProduct(store.db, { title: "Tan Cropped Suede Jacket", collectionHandle: "cropped-leather-jackets", price: 18999, sizes: ["M"] });
    expect(created.ok).toBe(true);
    const drafts = await listProducts(store.db, { status: "draft" });
    expect(drafts.some((product) => product.title === "Tan Cropped Suede Jacket")).toBe(true);
    expect((await listProducts(store.db, { status: "active" })).every((product) => product.status === "active")).toBe(true);
    expect((await listProducts(store.db, { query: "oxblood" })).map((product) => product.handle)).toEqual(["oxblood-lambskin-leather-jacket"]);
    expect(await productCounts(store.db)).toMatchObject({ draft: expect.any(Number), active: expect.any(Number), archived: 0 });
  });
});
