import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns";
import { products } from "./products";

export const collections = pgTable("collections", {
  id: uuid().primaryKey().defaultRandom(),
  // URL segment: /collections/[handle]
  handle: text().notNull().unique(),
  title: text().notNull(),
  description: text().notNull().default(""),
  seoTitle: text(),
  seoDescription: text(),
  position: integer().notNull().default(0),
  ...timestamps,
}).enableRLS();

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId] }),
    index().on(t.productId),
  ],
).enableRLS();
