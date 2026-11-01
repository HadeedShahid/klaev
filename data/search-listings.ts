// How the home page and the collection pages show in search results: the title (the layout adds
// " | Klaev" to a collection's) and the line under it. These are Shopify's, word for word, so search
// sees no change, with three corrections: delivery is free with bank transfer only, the belts are
// hidden, and the suede is goatskin. A collection added in the admin gets a plain listing from its
// name (lib/seo.ts).
export type Listing = { title: string; description: string };

export const HOME_LISTING: Listing = {
  title: "Klaev | Leather Jackets in Pakistan",
  description:
    "Shop genuine leather jackets and suede jackets online in Pakistan. Handcrafted from lambskin and goatskin. Free delivery on bank transfer.",
};

export const COLLECTION_LISTINGS: Record<string, Listing> = {
  all: {
    title: "Genuine Leather Jackets Online in Pakistan",
    description: "Shop genuine leather jackets and suede jackets online in Pakistan. Export quality leather. Handcrafted with premium materials. Free delivery on bank transfer.",
  },
  "cropped-leather-jackets": {
    title: "Men’s Cropped Leather Jackets in Pakistan",
    description: "Shop men’s cropped leather jackets in full-grain sheepskin. Discover clean waist-length fits with free delivery on bank transfer from Klaev Pakistan.",
  },
  "leather-jackets": {
    title: "Men's Genuine Leather Jackets Online in Pakistan",
    description: "Shop men's genuine leather jackets online in Pakistan. Lambskin leather. Soft, warm, minimal design. No logos. Free delivery on bank transfer.",
  },
  "suede-jackets": {
    title: "Men's Suede Leather Jackets Online in Pakistan",
    description: "Shop premium suede leather jackets for men in Pakistan. Soft texture. Timeless minimal design. Handcrafted with genuine goatskin suede. Free delivery on bank transfer.",
  },
  "leather-belts": {
    title: "Men’s Leather Belts in Pakistan",
    description: "Men’s belts in single-piece cow leather, made in Pakistan. Pay cash on delivery or by bank transfer, delivered across Pakistan.",
  },
};
