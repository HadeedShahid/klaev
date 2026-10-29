// @vitest-environment node
import { describe, expect, test } from "vitest";

import { POLICIES_WRITTEN } from "@/data/pages";

import type { Product } from "./catalog";
import { collectionSeo, productData, robotsFor, sharedImage, SITE_OPEN_GRAPH, sitemapEntries, storeData } from "./seo";

const jacket: Product = {
  handle: "black-cropped-leather-jacket",
  status: "active",
  title: "Black Cropped Leather Jacket",
  collection: "cropped-leather-jackets",
  price: 17999,
  compareAtPrice: null,
  colour: "Black",
  tagline: "Cropped at the waist, in black sheepskin.",
  seoTitle: null,
  seoDescription: null,
  intro: ["A short jacket in full-grain leather."],
  sections: [],
  variants: [
    { id: "1", sku: "CROP-BLK-S", size: "S", colour: "Black", available: false },
    { id: "2", sku: "CROP-BLK-M", size: "M", colour: "Black", available: true },
  ],
  sizeGuide: null,
  images: [
    { src: "https://media.example/products/black/1.webp", width: 1200, height: 1500, alt: "Front" },
    { src: "https://media.example/products/black/2.webp", width: 1200, height: 1500, alt: "Back" },
  ],
  tags: [],
};

describe("robots.txt", () => {
  test("klaev.com is open to crawlers except its private parts, and points to the sitemap", () => {
    expect(robotsFor("klaev.com")).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/orders/"] },
      sitemap: "https://klaev.com/sitemap.xml",
    });
  });

  test("any other address (the workers.dev preview, a local server) keeps crawlers out", () => {
    for (const host of ["klaev.hadeed-shahid08.workers.dev", "localhost:3100", "www.klaev.com.evil.example", null]) {
      expect(robotsFor(host), String(host)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    }
  });
});

describe("structured data", () => {
  test("a product gives its price in PKR, whether any size is in stock, its photos and the exchange policy", () => {
    const data = productData(jacket);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Black Cropped Leather Jacket",
      description: "A short jacket in full-grain leather.",
      url: "https://klaev.com/products/black-cropped-leather-jacket",
      image: ["https://media.example/products/black/1.webp", "https://media.example/products/black/2.webp"],
      brand: { "@type": "Brand", name: "Klaev" },
      color: "Black",
      offers: {
        "@type": "Offer",
        url: "https://klaev.com/products/black-cropped-leather-jacket",
        price: 17999,
        priceCurrency: "PKR",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "PK",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
          refundType: "https://schema.org/ExchangeRefund",
          merchantReturnLink: "https://klaev.com/policies/refund-policy",
        },
      },
    });

    const soldOut = productData({ ...jacket, variants: jacket.variants.map((variant) => ({ ...variant, available: false })) });
    expect(soldOut.offers.availability).toBe("https://schema.org/OutOfStock");
    // The product's own words describe it; Shopify's search line is the last resort.
    const unwritten = { ...jacket, intro: [], seoDescription: "Shop the black cropped jacket." };
    expect(productData(unwritten).description).toBe("Cropped at the waist, in black sheepskin.");
    expect(productData({ ...unwritten, tagline: null }).description).toBe("Shop the black cropped jacket.");
  });

  test("the store: an online shop in Lahore with its contacts, Instagram and exchange policy, and the site's name", () => {
    const graph = storeData()["@graph"];
    expect(graph.find((node) => node["@type"] === "OnlineStore")).toMatchObject({
      "@id": "https://klaev.com/#store",
      name: "Klaev",
      url: "https://klaev.com/",
      logo: "https://klaev.com/icon.png",
      image: "https://klaev.com/og/klaev.jpg",
      email: "business.klaev@gmail.com",
      telephone: "+923231483650",
      sameAs: ["https://instagram.com/getklaev"],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Office 2, First Floor, Ahad Plaza, 14L Gulberg 3",
        addressLocality: "Lahore",
        postalCode: "54660",
        addressCountry: "PK",
      },
      hasMerchantReturnPolicy: { merchantReturnDays: 7, refundType: "https://schema.org/ExchangeRefund" },
    });
    expect(graph.find((node) => node["@type"] === "WebSite")).toMatchObject({
      name: "Klaev",
      url: "https://klaev.com/",
      publisher: { "@id": "https://klaev.com/#store" },
    });
  });
});

describe("link previews", () => {
  test("a stored photo is shared as its 1200 wide copy, small enough for WhatsApp, with its size", () => {
    expect(sharedImage({ src: "https://pub-30ff49a2722f4493a6d913644221cdc9.r2.dev/products/dark-brown/02814017fe4f.webp", width: 1844, height: 2304, alt: "Front" })).toEqual({
      url: "https://pub-30ff49a2722f4493a6d913644221cdc9.r2.dev/products/dark-brown/02814017fe4f-1200.webp",
      width: 1200,
      height: 1499,
      alt: "Front",
    });
    // A photo narrower than 1200 was stored at its own width, never enlarged.
    expect(sharedImage({ src: "https://pub-30ff49a2722f4493a6d913644221cdc9.r2.dev/journal/fit/abc.webp", width: 900, height: 600, alt: "" })).toMatchObject({
      url: "https://pub-30ff49a2722f4493a6d913644221cdc9.r2.dev/journal/fit/abc-1200.webp",
      width: 900,
      height: 600,
    });
    // Anything not in the media bucket is shared as it is.
    expect(sharedImage({ src: "https://elsewhere.example/a.jpg", width: 800, height: 800, alt: "A" })).toEqual({ url: "https://elsewhere.example/a.jpg", width: 800, height: 800, alt: "A" });
  });

  test("every page shares the store's own preview unless it has a photo of its own", () => {
    expect(SITE_OPEN_GRAPH.images).toEqual([{ url: "/og/klaev.jpg", width: 1200, height: 630, alt: expect.stringContaining("Klaev") }]);
  });
});

describe("the sitemap", () => {
  test("lists every live page on klaev.com, with product photos and the dates pages and articles changed", () => {
    const edited = new Date("2026-11-02T10:00:00Z");
    const published = new Date("2026-10-01T10:00:00Z");
    const entries = sitemapEntries({
      products: [jacket],
      collections: [{ handle: "cropped-leather-jackets" }],
      pages: [
        { handle: "about", kind: "page", updatedAt: null },
        { handle: "refund-policy", kind: "policy", updatedAt: edited },
      ],
      posts: [
        { handle: "older", publishedAt: published, updatedAt: published, coverSrc: null },
        { handle: "how-it-fits", publishedAt: published, updatedAt: edited, coverSrc: "https://media.example/journal/fit.webp" },
      ],
    });
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://klaev.com/",
      "https://klaev.com/collections/all",
      "https://klaev.com/collections/cropped-leather-jackets",
      "https://klaev.com/products/black-cropped-leather-jacket",
      "https://klaev.com/pages/about",
      "https://klaev.com/policies/refund-policy",
      "https://klaev.com/pages/contact",
      "https://klaev.com/pages/jackets-size-chart",
      "https://klaev.com/blogs/blog",
      "https://klaev.com/blogs/blog/older",
      "https://klaev.com/blogs/blog/how-it-fits",
    ]);
    const at = (path: string) => entries.find((entry) => entry.url === `https://klaev.com${path}`);
    expect(at("/products/black-cropped-leather-jacket")?.images).toEqual(jacket.images.map((image) => image.src));
    expect(at("/pages/about")?.lastModified).toEqual(POLICIES_WRITTEN);
    expect(at("/policies/refund-policy")?.lastModified).toEqual(edited);
    expect(at("/blogs/blog")?.lastModified).toEqual(edited);
    expect(at("/blogs/blog/how-it-fits")).toMatchObject({ lastModified: edited, images: ["https://media.example/journal/fit.webp"] });
    expect(at("/blogs/blog/older")?.images).toBeUndefined();
  });

  test("with no articles, the journal is listed without a date", () => {
    const entries = sitemapEntries({ products: [], collections: [], pages: [], posts: [] });
    expect(entries.find((entry) => entry.url === "https://klaev.com/blogs/blog")?.lastModified).toBeUndefined();
  });
});

describe("collection search listings", () => {
  test("each collection has a title and description of search length, in the brand's words and with the real terms", () => {
    for (const collection of [
      { handle: "all", title: "Shop all" },
      { handle: "cropped-leather-jackets", title: "Cropped Leather Jackets" },
      { handle: "leather-jackets", title: "Leather Jackets" },
      { handle: "suede-jackets", title: "Suede Jackets" },
      { handle: "field-jackets", title: "Field Jackets" },
    ]) {
      const seo = collectionSeo(collection);
      expect(seo.title.length, collection.handle).toBeLessThanOrEqual(52);
      expect(seo.description.length, collection.handle).toBeLessThanOrEqual(160);
      for (const text of [seo.title, seo.description]) {
        expect(text, collection.handle).not.toMatch(/[–—]|free delivery|nationwide|luxury|premium/i);
      }
    }
    expect(collectionSeo({ handle: "suede-jackets", title: "Suede Jackets" }).title).toBe("Men’s Suede Jackets in Pakistan");
    // A collection added in the admin gets a plain listing from its own name.
    expect(collectionSeo({ handle: "field-jackets", title: "Field Jackets" }).title).toBe("Field Jackets in Pakistan");
  });
});
