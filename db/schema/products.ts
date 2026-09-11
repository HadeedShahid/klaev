import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns";

export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    // URL segment: /products/[handle]
    handle: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull().default(""),
    status: productStatus().notNull().default("draft"),
    // Whole rupees. Never store prices as floats.
    pricePkr: integer().notNull(),
    seoTitle: text(),
    seoDescription: text(),
    ...timestamps,
  },
  (t) => [
    check("products_price_pkr_positive", sql`${t.pricePkr} > 0`),
    index().on(t.status),
  ],
).enableRLS();

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Shopify pattern: BELT-{STYLE}-{COLOR}, e.g. BELT-STC-BK
    sku: text().notNull().unique(),
    // Jacket size or belt waist size. Null for one-size products.
    size: text(),
    stock: integer().notNull().default(0),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check("product_variants_stock_non_negative", sql`${t.stock} >= 0`),
    unique("product_variants_product_id_size_unique").on(t.productId, t.size),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Supabase Storage object path
    path: text().notNull(),
    alt: text().notNull(),
    // Required so next/image can reserve space and avoid layout shift.
    width: integer().notNull(),
    height: integer().notNull(),
    position: integer().notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [index().on(t.productId, t.position)],
).enableRLS();
