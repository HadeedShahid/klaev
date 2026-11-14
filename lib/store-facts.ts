import "server-only";

import { getCollections, getProducts } from "./catalog";
import { getDb } from "./db";
import { fillFaq, getFaq } from "./faq";
import { listPublished } from "./journal";
import type { StoreFacts } from "./llms";
import { listPages } from "./pages";
import { getCodTerms } from "./settings";
import { fillTerms } from "./store-terms";

// Everything the AI guides (lib/llms.ts) say about the store, read live: the jackets on sale with
// their stock, the collections, the pages and FAQ with today's terms written in, and the journal.
export async function storeFacts(): Promise<StoreFacts> {
  const db = await getDb();
  const [products, collections, pages, faq, terms, posts] = await Promise.all([
    getProducts(),
    getCollections(),
    listPages(db),
    getFaq(db),
    getCodTerms(db),
    listPublished(db),
  ]);
  return {
    products,
    collections,
    terms,
    pages: pages.map((page) => ({
      handle: page.handle,
      kind: page.kind,
      title: page.title,
      description: fillTerms(page.description, terms),
      body: fillTerms(page.body, terms),
    })),
    faq: fillFaq(faq, terms),
    posts: posts.map((post) => ({ handle: post.handle, title: post.title, summary: post.seoDescription ?? post.excerpt })),
  };
}
