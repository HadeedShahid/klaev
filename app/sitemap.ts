import type { MetadataRoute } from "next";

import { getCollections, getProducts } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { listPublished } from "@/lib/journal";
import { listPages } from "@/lib/pages";
import { sitemapEntries } from "@/lib/seo";

// Read on every request, so a product or article published in the admin is listed at once. Crawlers
// fetch it a few times a day; it's four small reads.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [products, collections, pages, posts] = await Promise.all([getProducts(), getCollections(), listPages(db), listPublished(db)]);
  return sitemapEntries({ products, collections, pages, posts });
}
