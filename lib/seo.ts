import type { MetadataRoute } from "next";

import { POLICIES_WRITTEN, type PageKind } from "@/data/pages";
import { COLLECTION_LISTINGS, HOME_LISTING, type Listing } from "@/data/search-listings";

import type { Product } from "./catalog";
import { MEDIA_URL } from "./media";
import { STORE } from "./store";

// What search engines and link previews are told about the store: schema.org data, the sitemap and
// robots.txt. Every address is on the real domain, whichever host served the page.
const SITE = STORE.siteUrl;
const STORE_ID = `${SITE}/#store`;

// Open Graph fields every page shares, the picture included (scripts/brand-images.ts makes it). A
// page that sets its own openGraph spreads these in, because Next replaces the layout's openGraph
// rather than merging into it; one with a photo of its own replaces the picture.
export const SITE_OPEN_GRAPH = {
  siteName: "Klaev",
  locale: "en_PK",
  images: [{ url: "/og/klaev.jpg", width: 1200, height: 630, alt: "Three Klaev cropped leather jackets, worn: dark brown, black and burgundy" }],
};

const PREVIEW_WIDTH = 1200;

// A photo from the media bucket as a link preview: its stored 1200 wide copy, a third to a half of
// the full size's bytes, so the preview arrives quickly on mobile data. A photo narrower than that was stored
// at its own width. Anything else is shared as it is.
export function sharedImage(image: { src: string; width: number; height: number; alt: string }) {
  if (!image.src.startsWith(`${MEDIA_URL}/`) || !image.src.endsWith(".webp")) {
    return { url: image.src, width: image.width, height: image.height, alt: image.alt };
  }
  const width = Math.min(PREVIEW_WIDTH, image.width);
  return { url: image.src.replace(/\.webp$/, `-${PREVIEW_WIDTH}.webp`), width, height: Math.round((image.height * width) / image.width), alt: image.alt };
}

// Only the real domain is for search. The workers.dev preview serves the same store, and a copy of
// it in the index would compete with klaev.com.
export function robotsFor(host: string | null): MetadataRoute.Robots {
  if (host !== new URL(SITE).host) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/orders/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}

// The exchanges and refunds policy as schema.org puts it: a size exchange within the exchange
// window, sent back by courier at the customer's cost, and no refunds.
const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "PK",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: STORE.exchangeDays,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  refundType: "https://schema.org/ExchangeRefund",
  merchantReturnLink: `${SITE}/policies/refund-policy`,
};

// One offer per product: every size costs the same, and it's in stock while any size is.
export function productData(product: Product) {
  const url = `${SITE}/products/${product.handle}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.intro.length > 0 ? product.intro.join("\n\n") : (product.tagline ?? product.seoDescription ?? undefined),
    url,
    image: product.images.map((image) => image.src),
    brand: { "@type": "Brand", name: "Klaev" },
    color: product.colour ?? undefined,
    offers: {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: "PKR",
      availability: product.variants.some((variant) => variant.available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      hasMerchantReturnPolicy: RETURN_POLICY,
    },
  };
}

// The store itself, for the home page: who sells, where, how to reach them, and the site's name.
export function storeData(): { "@context": string; "@graph": Record<string, unknown>[] } {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": STORE_ID,
        name: "Klaev",
        url: `${SITE}/`,
        description: HOME_LISTING.description,
        logo: `${SITE}/icon.png`,
        image: `${SITE}${SITE_OPEN_GRAPH.images[0].url}`,
        email: STORE.email,
        telephone: `+${STORE.whatsappNumber}`,
        sameAs: [`https://instagram.com/${STORE.instagram}`],
        address: {
          "@type": "PostalAddress",
          streetAddress: STORE.address.street,
          addressLocality: STORE.address.city,
          postalCode: STORE.address.postalCode,
          addressCountry: "PK",
        },
        hasMerchantReturnPolicy: RETURN_POLICY,
      },
      { "@type": "WebSite", "@id": `${SITE}/#website`, name: "Klaev", url: `${SITE}/`, publisher: { "@id": STORE_ID } },
    ],
  };
}

export function collectionSeo(collection: { handle: string; title: string }): Listing {
  return (
    COLLECTION_LISTINGS[collection.handle] ?? {
      title: `${collection.title} in Pakistan`,
      description: `${collection.title} from Klaev, cut from real leather and made in Pakistan. Pay cash on delivery or by bank transfer.`,
    }
  );
}

type SitemapInput = {
  products: Pick<Product, "handle" | "images">[];
  collections: { handle: string }[];
  pages: { handle: string; kind: PageKind; updatedAt: Date | null }[];
  posts: { handle: string; publishedAt: Date | null; updatedAt: Date; coverSrc: string | null }[];
};

// Every page the store wants found. Product photos and article covers ride along for image search.
// Pages carry the date they last changed where the store knows it.
export function sitemapEntries({ products, collections, pages, posts }: SitemapInput): MetadataRoute.Sitemap {
  const at = (path: string) => `${SITE}${path}`;
  const newestPost = posts.reduce<Date | undefined>((newest, post) => (!newest || post.updatedAt > newest ? post.updatedAt : newest), undefined);
  return [
    { url: at("/") },
    { url: at("/collections/all") },
    ...collections.map((collection) => ({ url: at(`/collections/${collection.handle}`) })),
    ...products.map((product) => ({ url: at(`/products/${product.handle}`), images: product.images.map((image) => image.src) })),
    ...pages.map((page) => ({
      url: at(`/${page.kind === "policy" ? "policies" : "pages"}/${page.handle}`),
      lastModified: page.updatedAt ?? POLICIES_WRITTEN,
    })),
    { url: at("/pages/contact") },
    { url: at("/pages/jackets-size-chart") },
    { url: at("/blogs/blog"), lastModified: newestPost },
    ...posts.map((post) => ({
      url: at(`/blogs/blog/${post.handle}`),
      lastModified: post.updatedAt,
      images: post.coverSrc ? [post.coverSrc] : undefined,
    })),
  ];
}
