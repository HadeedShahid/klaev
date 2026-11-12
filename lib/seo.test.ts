// @vitest-environment node
import { describe, expect, test } from "vitest";

import { POLICIES_WRITTEN } from "@/data/pages";
import { HOME_LISTING } from "@/data/search-listings";

import type { Product } from "./catalog";
import { articleData, collectionSeo, productData, robotsFor, sharedImage, SITE_OPEN_GRAPH, sitemapEntries, storeData } from "./seo";

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
      rules: [
        expect.objectContaining({ userAgent: "*", allow: "/", disallow: expect.arrayContaining(["/admin", "/api/", "/checkout", "/orders", "/cart/", "/account", "/collections/*sort_by*"]) }),
        expect.objectContaining({ userAgent: "adsbot-google", allow: ["/products/", "/collections/", "/pages/", "/blogs/"], disallow: expect.arrayContaining(["/checkout", "/orders"]) }),
      ],
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
      "@type": "ProductGroup",
      name: "Black Cropped Leather Jacket",
      description: "A short jacket in full-grain leather.",
      url: "https://klaev.com/products/black-cropped-leather-jacket",
      image: ["https://media.example/products/black/1.webp", "https://media.example/products/black/2.webp"],
      brand: { "@type": "Brand", name: "Klaev" },
      color: "Black",
      variesBy: ["https://schema.org/size"],
    });
    expect(data.hasVariant[0].offers.availability).toBe("https://schema.org/OutOfStock");
    expect(data.hasVariant[1]).toMatchObject({
      "@type": "Product",
      size: "M",
      sku: "CROP-BLK-M",
      color: "Black",
      offers: {
        "@type": "Offer",
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
        // Delivery is the store's one policy (on the home page); each size points to it by its @id.
        shippingDetails: { "@type": "OfferShippingDetails", hasShippingService: { "@id": "https://klaev.com/#shipping" } },
      },
    });

    const soldOut = productData({ ...jacket, variants: jacket.variants.map((variant) => ({ ...variant, available: false })) });
    expect(soldOut.hasVariant.map((variant) => variant.offers.availability)).toEqual(jacket.variants.map(() => "https://schema.org/OutOfStock"));
    // The product's own words describe it; Shopify's search line is the last resort.
    const unwritten = { ...jacket, intro: [], seoDescription: "Shop the black cropped jacket." };
    expect(productData(unwritten).description).toBe("Cropped at the waist, in black sheepskin.");
    expect(productData({ ...unwritten, tagline: null }).description).toBe("Shop the black cropped jacket.");
  });

  test("a product's own published reviews give it a rating in search; none, no rating", () => {
    expect(productData(jacket)).not.toHaveProperty("aggregateRating");
    const rated = productData(jacket, [
      { rating: 5, body: "Soft and real.", name: "Ali K." },
      { rating: 4, body: null, name: "Hamza R." },
    ]);
    expect(rated.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.5, reviewCount: 2, bestRating: 5, worstRating: 1 });
    expect(rated.review).toEqual([
      { "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 }, author: { "@type": "Person", name: "Ali K." }, reviewBody: "Soft and real." },
      { "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: 4, bestRating: 5, worstRating: 1 }, author: { "@type": "Person", name: "Hamza R." } },
    ]);
  });

  test("the store: an online shop in Lahore with its contacts, Instagram and exchange policy, and the site's name", () => {
    const graph = storeData(900)["@graph"];
    expect(graph.find((node) => node["@type"] === "OnlineStore")).toMatchObject({
      "@id": "https://klaev.com/#store",
      name: "Klaev",
      url: "https://klaev.com/",
      logo: "https://klaev.com/icon.png",
      image: "https://klaev.com/og/klaev.jpg",
      email: "business.klaev@gmail.com",
      telephone: "+923231483650",
      sameAs: ["https://www.instagram.com/getklaev/", "https://www.facebook.com/profile.php?id=61575756869911", "https://www.tiktok.com/@getklaev"],
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

  // Google can't tie a rate to how someone pays, and where two rates fit it shows the lower one, so
  // a free rate would read as free delivery for everyone. It gets the most delivery costs instead.
  test("the store's delivery: Pakistan, up to the cash on delivery fee, in 2 to 5 days", () => {
    const store = storeData(1100)["@graph"].find((node) => node["@type"] === "OnlineStore");
    expect(store?.hasShippingService).toEqual({
      "@type": "ShippingService",
      // What each size's offer points to.
      "@id": "https://klaev.com/#shipping",
      name: "Delivery across Pakistan",
      description: "PKR 1,100 with cash on delivery, free with a bank transfer. Most orders arrive in 2 to 5 days.",
      fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
      shippingConditions: {
        "@type": "ShippingConditions",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "PK" },
        shippingRate: { "@type": "MonetaryAmount", maxValue: 1100, currency: "PKR" },
        transitTime: { "@type": "ServicePeriod", duration: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" } },
      },
    });
  });

  // Google: "Use the Person type for people, and the Organization type for organizations."
  test("an article is written by Klaev, the organisation, and published by it", () => {
    const post = {
      handle: "how-a-cropped-leather-jacket-should-fit",
      title: "How a Cropped Leather Jacket Should Fit",
      seoDescription: "How it should sit at the waist.",
      excerpt: "An excerpt.",
      publishedAt: new Date("2026-09-20T08:11:30Z"),
      updatedAt: new Date("2026-10-31T19:28:16Z"),
      coverSrc: "https://media.example/journal/fit.webp",
    };
    expect(articleData(post)).toEqual({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How a Cropped Leather Jacket Should Fit",
      description: "How it should sit at the waist.",
      datePublished: "2026-09-20T08:11:30.000Z",
      dateModified: "2026-10-31T19:28:16.000Z",
      image: "https://media.example/journal/fit.webp",
      author: { "@type": "Organization", name: "Klaev", url: "https://klaev.com/" },
      publisher: { "@type": "Organization", name: "Klaev" },
      mainEntityOfPage: { "@type": "WebPage", "@id": "https://klaev.com/blogs/blog/how-a-cropped-leather-jacket-should-fit" },
    });
    // Without a search description it falls back to the excerpt, and without a cover it has no image.
    expect(articleData({ ...post, seoDescription: null, coverSrc: null })).toMatchObject({ description: "An excerpt.", image: undefined });
  });
});

describe("link previews", () => {
  test("a stored photo is shared as its 1200 wide copy, small enough for WhatsApp, with its size", () => {
    expect(sharedImage({ src: "https://media.klaev.com/products/dark-brown/02814017fe4f.webp", width: 1844, height: 2304, alt: "Front" })).toEqual({
      url: "https://media.klaev.com/products/dark-brown/02814017fe4f-1200.webp",
      width: 1200,
      height: 1499,
      alt: "Front",
    });
    // A photo narrower than 1200 was stored at its own width, never enlarged.
    expect(sharedImage({ src: "https://media.klaev.com/journal/fit/abc.webp", width: 900, height: 600, alt: "" })).toMatchObject({
      url: "https://media.klaev.com/journal/fit/abc-1200.webp",
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

describe("the home page's search listing", () => {
  // Measured in Google's results on 8 November 2026: the home page's result is three full-width lines
  // on a phone, which held 150 characters at 360 and 375 px wide and cut a 164-character one short.
  test("the description shows whole on a phone, in the brand's words", () => {
    expect(HOME_LISTING.description.length).toBeLessThanOrEqual(150);
    expect(HOME_LISTING.description).not.toMatch(/[–—]|free delivery(?! on bank transfer)/i);
  });
});

describe("collection search listings", () => {
  test("each collection has a title and description of search length, in the brand's words and with the real terms", () => {
    for (const collection of [
      { handle: "all", title: "All" },
      { handle: "cropped-leather-jackets", title: "Men’s Cropped Leather Jackets" },
      { handle: "leather-jackets", title: "Leather Jackets" },
      { handle: "suede-jackets", title: "Suede Jackets" },
      { handle: "field-jackets", title: "Field Jackets" },
    ]) {
      const seo = collectionSeo(collection);
      expect(seo.title.length, collection.handle).toBeLessThanOrEqual(52);
      expect(seo.description.length, collection.handle).toBeLessThanOrEqual(170);
      for (const text of [seo.title, seo.description]) {
        // Shopify's words, but delivery is only free with bank transfer.
        expect(text, collection.handle).not.toMatch(/[–—]|free delivery(?! on bank transfer)|nationwide/i);
      }
    }
    expect(collectionSeo({ handle: "suede-jackets", title: "Suede Jackets" }).title).toBe("Men's Suede Leather Jackets Online in Pakistan");
    // A collection added in the admin gets a plain listing from its own name.
    expect(collectionSeo({ handle: "field-jackets", title: "Field Jackets" }).title).toBe("Field Jackets in Pakistan");
  });
});
