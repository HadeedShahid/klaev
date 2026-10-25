import { relations, sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { SizeGuide } from "../sizing";

// Money is whole rupees: PKR has no paisa in practice, and formatPKR refuses fractions.
// Times are Unix seconds. Column names are snake_case in SQL (see `casing` in lib/db and drizzle.config.ts).

export type ProductSection = {
  heading: string;
  items: { title: string | null; text: string }[];
  paragraphs: string[];
};

const createdAt = integer({ mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);
const updatedAt = integer({ mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`)
  .$onUpdate(() => new Date());

export const collections = sqliteTable("collections", {
  handle: text().primaryKey(),
  title: text().notNull(),
  position: integer().notNull().default(0),
});

export const products = sqliteTable(
  "products",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    handle: text().notNull().unique(),
    // Drafts are kept but never shown or sold. Belts are drafts until they launch.
    status: text({ enum: ["active", "draft"] }).notNull().default("draft"),
    title: text().notNull(),
    collectionHandle: text()
      .notNull()
      .references(() => collections.handle, { onUpdate: "cascade" }),
    price: integer().notNull(),
    compareAtPrice: integer(),
    colour: text(),
    tagline: text(),
    intro: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    sections: text({ mode: "json" }).$type<ProductSection[]>().notNull().default([]),
    sizeGuide: text({ mode: "json" }).$type<SizeGuide>(),
    tags: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    // Kept from Shopify so search results keep their wording through the move.
    seoTitle: text(),
    seoDescription: text(),
    position: integer().notNull().default(0),
    publishedAt: integer({ mode: "timestamp" }),
    createdAt,
    updatedAt,
  },
  (t) => [index("products_collection_idx").on(t.collectionHandle)],
);

export const variants = sqliteTable(
  "variants",
  {
    // Variants imported from Shopify keep their Shopify ids, so carts and old orders still resolve.
    id: integer().primaryKey({ autoIncrement: true }),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text().notNull().unique(),
    size: text(),
    colour: text(),
    position: integer().notNull().default(0),
    // Units free to sell. An order takes its units when it is placed; a cancellation puts them back.
    stock: integer().notNull().default(0),
    // What Klaev paid per unit, for profit reports. Never shown on the storefront.
    costPrice: integer(),
    createdAt,
    updatedAt,
  },
  (t) => [index("variants_product_idx").on(t.productId), check("variants_stock_check", sql`${t.stock} >= 0`)],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
    src: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    alt: text().notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const customers = sqliteTable(
  "customers",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text(),
    // Lowercase. Some customers only ever gave a phone number.
    email: text().unique(),
    // International format, +92 for Pakistan (lib/phone.ts).
    phone: text(),
    acceptsMarketing: integer({ mode: "boolean" }).notNull().default(false),
    address1: text(),
    address2: text(),
    city: text(),
    province: text(),
    postalCode: text(),
    country: text().notNull().default("PK"),
    tags: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    note: text(),
    shopifyId: text().unique(),
    createdAt,
    updatedAt,
  },
  (t) => [index("customers_phone_idx").on(t.phone)],
);

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export const PAYMENT_METHODS = ["cod", "bank_transfer", "in_person"] as const;

export const orders = sqliteTable(
  "orders",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // The number customers see. Shopify used #1001 to #1021; this store carries on from there.
    number: integer().notNull().unique(),
    customerId: integer().references(() => customers.id, { onDelete: "set null" }),
    status: text({ enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text({ enum: PAYMENT_METHODS }).notNull(),
    // Contact and delivery details as given with the order, kept even if the customer record changes.
    name: text().notNull(),
    email: text(),
    phone: text(),
    address1: text(),
    address2: text(),
    city: text(),
    province: text(),
    postalCode: text(),
    country: text().notNull().default("PK"),
    // subtotal is the lines before any discount; total = subtotal - discountTotal + deliveryFee.
    subtotal: integer().notNull(),
    discountCode: text(),
    discountTotal: integer().notNull().default(0),
    deliveryFee: integer().notNull().default(0),
    total: integer().notNull(),
    // Cash on delivery: the advance sent to confirm the order. The courier collects the rest.
    advance: integer().notNull().default(0),
    // What the courier charged Klaev for this parcel, for profit reports.
    courierFee: integer(),
    trackingNumber: text(),
    note: text(),
    // web: placed on the site. manual: entered by Klaev (WhatsApp, in person).
    source: text({ enum: ["web", "manual"] }).notNull().default("web"),
    shopifyId: text().unique(),
    createdAt,
    confirmedAt: integer({ mode: "timestamp" }),
    shippedAt: integer({ mode: "timestamp" }),
    deliveredAt: integer({ mode: "timestamp" }),
    cancelledAt: integer({ mode: "timestamp" }),
    updatedAt,
  },
  (t) => [
    index("orders_customer_idx").on(t.customerId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderLines = sqliteTable(
  "order_lines",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Null once the variant is deleted; the copied details below keep the line readable.
    variantId: integer().references(() => variants.id, { onDelete: "set null" }),
    title: text().notNull(),
    size: text(),
    sku: text(),
    quantity: integer().notNull(),
    unitPrice: integer().notNull(),
    // Unit cost when sold, so later cost changes do not rewrite past profit.
    costPrice: integer(),
  },
  (t) => [
    index("order_lines_order_idx").on(t.orderId),
    index("order_lines_variant_idx").on(t.variantId),
    check("order_lines_quantity_check", sql`${t.quantity} > 0`),
  ],
);

// The payment ledger: every rupee received against an order. Paid so far is the sum of its rows.
// A COD advance is a bank_transfer row on a cod order; the courier's collection is a cod row.
export const payments = sqliteTable(
  "payments",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: text({ enum: ["bank_transfer", "cod", "cash"] }).notNull(),
    amount: integer().notNull(),
    reference: text(),
    note: text(),
    receivedAt: integer({ mode: "timestamp" }).notNull(),
    createdAt,
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  collection: one(collections, { fields: [products.collectionHandle], references: [collections.handle] }),
  variants: many(variants),
  images: many(productImages),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  lines: many(orderLines),
  payments: many(payments),
}));

export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
  variant: one(variants, { fields: [orderLines.variantId], references: [variants.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
