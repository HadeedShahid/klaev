// Addresses Shopify used that this store doesn't have, sent to the nearest page (next.config.ts).
// Permanent where Shopify's shape is gone for good. Temporary where the store may build its own
// page one day (search, customer accounts, a list of collections), so browsers don't keep the
// redirect. Hidden products and collections (the belts) are sent on by their pages instead, so they
// come back on their own when they're live again (hiddenProductRedirect in lib/catalog.ts).
export const SHOPIFY_REDIRECTS = [
  // A product reached through a collection, and a collection filtered by a tag.
  { source: "/collections/:collection/products/:product", destination: "/products/:product", permanent: true },
  { source: "/collections/:collection/:tag", destination: "/collections/:collection", permanent: true },
  { source: "/products", destination: "/collections/all", permanent: true },
  { source: "/blogs/blog/tagged/:tag", destination: "/blogs/blog", permanent: true },
  // Shopify's split sitemaps, which Search Console may still have on file.
  { source: "/:file(sitemap_.+\\.xml)", destination: "/sitemap.xml", permanent: true },
  // Order status and checkout links from Shopify's emails (/<shop id>/orders/...), and cart links.
  { source: "/:shop(\\d+)/orders/:path*", destination: "/track", permanent: true },
  { source: "/:shop(\\d+)/checkouts/:path*", destination: "/cart", permanent: true },
  { source: "/checkouts/:path+", destination: "/cart", permanent: true },
  // :path+ rather than :path*, which would match /cart itself and loop.
  { source: "/cart/:path+", destination: "/cart", permanent: true },
  { source: "/collections", destination: "/collections/all", permanent: false },
  { source: "/search", destination: "/collections/all", permanent: false },
  { source: "/account/:path*", destination: "/track", permanent: false },
];
