import { relations, sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

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
    // Drafts are kept but never shown or sold (belts are drafts until they launch). Archived products
    // are retired: hidden from the store and from the admin's working lists.
    status: text({ enum: ["active", "draft", "archived"] }).notNull().default("draft"),
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

// pending: placed, waiting for the advance or transfer. refused: turned away at the door (returned to origin).
export const ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "refused"] as const;
// Where a shipped parcel is, as the courier's tracking shows it. Set by hand from the admin.
export const COURIER_STATUSES = ["booked", "in_transit", "out_for_delivery", "attempted", "returning"] as const;
export const PAYMENT_METHODS = ["cod", "bank_transfer", "in_person"] as const;

export const orders = sqliteTable(
  "orders",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // The number customers see. Shopify used #1001 to #1021; this store carries on from there.
    number: integer().notNull().unique(),
    // The secret in the customer's order link (/orders/<token>). Orders imported from Shopify have none.
    token: text().unique(),
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
    // What the courier charged Klaev upfront for this parcel (delivery, plus cash handling on COD).
    courierFee: integer(),
    // What the courier kept when paying a COD order's cash out: 4% of the COD amount as tax, and
    // anything else it deducted. Set with the payout.
    codTax: integer().notNull().default(0),
    trackingNumber: text(),
    // While shipped: booked, in transit, out for delivery, a failed attempt, or on its way back.
    courierStatus: text({ enum: COURIER_STATUSES }),
    courierStatusAt: integer({ mode: "timestamp" }),
    note: text(),
    // web: placed on the site. manual: entered by Klaev (WhatsApp, in person). exchange: a size
    // exchange, sent out against the order it replaces.
    source: text({ enum: ["web", "manual", "exchange"] }).notNull().default("web"),
    // An exchange: the order it replaces, the size coming back, and when that arrived and went back in stock.
    exchangeOf: integer().references((): AnySQLiteColumn => orders.id, { onDelete: "set null" }),
    returnVariantId: integer().references(() => variants.id, { onDelete: "set null" }),
    returnedAt: integer({ mode: "timestamp" }),
    shopifyId: text().unique(),
    createdAt,
    confirmedAt: integer({ mode: "timestamp" }),
    packedAt: integer({ mode: "timestamp" }),
    shippedAt: integer({ mode: "timestamp" }),
    deliveredAt: integer({ mode: "timestamp" }),
    cancelledAt: integer({ mode: "timestamp" }),
    refusedAt: integer({ mode: "timestamp" }),
    // When the courier paid this COD order's cash out to Klaev.
    paidOutAt: integer({ mode: "timestamp" }),
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

// Discount codes customers type at checkout: a percentage or a fixed amount off the order, or free
// delivery. Every limit is optional. Uses are counted from the orders that carry the code.
export const DISCOUNT_KINDS = ["percent", "fixed", "free_delivery"] as const;

export const discounts = sqliteTable("discounts", {
  id: integer().primaryKey({ autoIncrement: true }),
  // Stored in capitals; customers can type it any way.
  code: text().notNull().unique(),
  kind: text({ enum: DISCOUNT_KINDS }).notNull(),
  // Percent off (1 to 100) or rupees off; unused for free delivery.
  value: integer().notNull().default(0),
  minSubtotal: integer(),
  startsAt: integer({ mode: "timestamp" }),
  endsAt: integer({ mode: "timestamp" }),
  usageLimit: integer(),
  // One use per phone number.
  oncePerCustomer: integer({ mode: "boolean" }).notNull().default(false),
  active: integer({ mode: "boolean" }).notNull().default(true),
  createdAt,
  updatedAt,
});

// Every change to a size's stock and why, newest last: a restock, a count corrected by hand, a sale,
// or pieces back from a cancelled or refused order. `stockAfter` is what was left after it.
export const STOCK_REASONS = ["restock", "correction", "sale", "cancelled", "refused", "edit", "exchange"] as const;

export const stockChanges = sqliteTable(
  "stock_changes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    variantId: integer()
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    change: integer().notNull(),
    stockAfter: integer().notNull(),
    reason: text({ enum: STOCK_REASONS }).notNull(),
    orderId: integer().references(() => orders.id, { onDelete: "set null" }),
    note: text(),
    createdAt,
  },
  (t) => [index("stock_changes_variant_idx").on(t.variantId)],
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

// Bank transfer receipts customers upload from their order page. The files live in the private
// klaev-receipts R2 bucket under `key`.
export const receipts = sqliteTable(
  "receipts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    key: text().notNull().unique(),
    contentType: text().notNull(),
    size: integer().notNull(),
    createdAt,
  },
  (t) => [index("receipts_order_idx").on(t.orderId)],
);

// Store settings the admin will edit, one JSON value per key (lib/settings.ts).
// A checkout someone started: what they'd typed and what was in the cart, saved once the phone
// number is in. It's abandoned if no order follows; `orderId` is set when one does.
export const checkouts = sqliteTable(
  "checkouts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // The browser's key to its own checkout (the klaev_checkout cookie).
    token: text().notNull().unique(),
    name: text(),
    email: text(),
    phone: text().notNull(),
    city: text(),
    address: text(),
    lines: text({ mode: "json" }).$type<{ variantId: number; title: string; size: string | null; quantity: number; price: number }[]>().notNull(),
    subtotal: integer().notNull(),
    orderId: integer().references(() => orders.id, { onDelete: "set null" }),
    // When Klaev followed up on WhatsApp.
    contactedAt: integer({ mode: "timestamp" }),
    createdAt,
    updatedAt,
  },
  (t) => [index("checkouts_phone_idx").on(t.phone), index("checkouts_updated_idx").on(t.updatedAt)],
);

// The journal: articles at /blogs/blog/<handle>, the address Shopify gave them. The body is plain
// text: a blank line starts a paragraph, "## " a heading, "- " a list item (lib/journal.ts).
export const POST_STATUSES = ["draft", "published"] as const;

export const posts = sqliteTable("posts", {
  id: integer().primaryKey({ autoIncrement: true }),
  handle: text().notNull().unique(),
  title: text().notNull(),
  excerpt: text(),
  body: text().notNull().default(""),
  coverSrc: text(),
  coverWidth: integer(),
  coverHeight: integer(),
  coverAlt: text(),
  status: text({ enum: POST_STATUSES }).notNull().default("draft"),
  publishedAt: integer({ mode: "timestamp" }),
  seoTitle: text(),
  seoDescription: text(),
  createdAt,
  updatedAt,
});

export const settings = sqliteTable("settings", {
  key: text().primaryKey(),
  value: text({ mode: "json" }).notNull(),
  updatedAt,
});

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
  receipts: many(receipts),
}));

export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
  variant: one(variants, { fields: [orderLines.variantId], references: [variants.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const stockChangesRelations = relations(stockChanges, ({ one }) => ({
  variant: one(variants, { fields: [stockChanges.variantId], references: [variants.id] }),
  order: one(orders, { fields: [stockChanges.orderId], references: [orders.id] }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  order: one(orders, { fields: [receipts.orderId], references: [orders.id] }),
}));
