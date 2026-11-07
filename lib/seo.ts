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
const SAME_AS = [
  `https://www.instagram.com/${STORE.instagram}/`,
  "https://www.facebook.com/profile.php?id=61575756869911",
  "https://www.tiktok.com/@getklaev",
];

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

// Shopify's rules, so crawlers keep treating the store's old addresses the same way, plus /api/.
// Left out: its /*/ copies for translated stores, and the Allow lines that only undid those copies.
const CRAWL_PRIVATE = ["/admin", "/api/", "/checkout", "/checkouts/", "/orders", "/services", "/sf_*", "/62407966791", "/cdn/wpm/*.js"];
const CRAWL_NOISE = [
  "/cart/",
  "/cart.js",
  "/account",
  "/recommendations/products",
  "/.well-known/shopify/monorail",
  "/collections/*sort_by*",
  "/collections/*+*",
  "/collections/*%2B*",
  "/collections/*%2b*",
  "/collections/*filter*&*filter*",
  "/blogs/*+*",
  "/blogs/*%2B*",
  "/blogs/*%2b*",
  "/*?*ls=*&ls=*",
  "/*?*ls%3*ls%3*",
  "/*?*oseid=*",
  "/*?*preview_theme_id=*",
  "/*?*preview_script_id=*",
];

// Only the real domain is for search. The workers.dev preview serves the same store, and a copy of
// it in the index would compete with klaev.com.
export function robotsFor(host: string | null): MetadataRoute.Robots {
  if (host !== new URL(SITE).host) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...CRAWL_PRIVATE, ...CRAWL_NOISE] },
      { userAgent: "adsbot-google", allow: ["/products/", "/collections/", "/pages/", "/blogs/"], disallow: CRAWL_PRIVATE },
    ],
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

// Shopify's shape: the jacket as a group, and each size its own product with its own offer, so
// search sees which sizes are in stock. Only the cropped jackets named a material there.
type RatedReview = { rating: number; body: string | null; name: string };

// A product's own reviews, as search wants them: the average and count, and the reviews themselves.
function ratingData(reviews: RatedReview[]) {
  if (reviews.length === 0) return {};
  const average = Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10;
  return {
    aggregateRating: { "@type": "AggregateRating", ratingValue: average, reviewCount: reviews.length, bestRating: 5, worstRating: 1 },
    review: reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      author: { "@type": "Person", name: review.name },
      ...(review.body ? { reviewBody: review.body } : {}),
    })),
  };
}

export function productData(product: Product, reviews: RatedReview[] = []) {
  const url = `${SITE}/products/${product.handle}`;
  const description = product.intro.length > 0 ? product.intro.join("\n\n") : (product.tagline ?? product.seoDescription ?? undefined);
  const image = product.images.map((photo) => photo.src);
  const material = product.collection === "cropped-leather-jackets" ? "A-grade full-grain sheepskin" : undefined;
  const color = product.colour ?? undefined;
  return {
    "@context": "https://schema.org",
    "@id": `${url}#product`,
    "@type": "ProductGroup",
    name: product.title,
    url,
    description,
    image,
    brand: { "@type": "Brand", name: "Klaev" },
    category: product.collection.endsWith("-jackets") ? "Coats & Jackets" : undefined,
    material,
    color,
    audience: { "@type": "PeopleAudience", suggestedGender: "male" },
    productGroupID: product.handle,
    ...ratingData(reviews),
    variesBy: ["https://schema.org/size"],
    hasVariant: product.variants.map((variant) => {
      const variantUrl = `${url}?variant=${variant.id}`;
      const option = [variant.size, variant.colour ?? product.colour].filter(Boolean).join(" / ");
      return {
        "@id": `${variantUrl}#variant`,
        "@type": "Product",
        name: option ? `${product.title} - ${option}` : product.title,
        description,
        sku: variant.sku,
        size: variant.size ?? undefined,
        color,
        material,
        image: image[0],
        offers: {
          "@type": "Offer",
          url: variantUrl,
          price: product.price,
          priceCurrency: "PKR",
          availability: variant.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          hasMerchantReturnPolicy: RETURN_POLICY,
        },
      };
    }),
  };
}

// Who runs the store, on every page, as Shopify's theme had it. Same @id as the fuller record on the
// home page, so search reads the two as one business.
export function organizationData() {
  return { "@context": "https://schema.org", "@type": "Organization", "@id": STORE_ID, name: "Klaev", url: `${SITE}/`, logo: `${SITE}/icon.png`, sameAs: SAME_AS };
}

// The questions on the home page. Only for questions the page shows: search doesn't allow hidden ones.
export function faqData(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
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
        sameAs: SAME_AS,
        address: {
          "@type": "PostalAddress",
          streetAddress: STORE.address.street,
          addressLocality: STORE.address.city,
          postalCode: STORE.address.postalCode,
          addressCountry: "PK",
        },
        hasMerchantReturnPolicy: RETURN_POLICY,
      },
      { "@type": "WebSite", "@id": `${SITE}/#website`, name: "Klaev", url: `${SITE}/`, inLanguage: "en-PK", publisher: { "@id": STORE_ID } },
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
