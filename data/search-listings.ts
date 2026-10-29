// How the home page and the collection pages show in search results: the title (the layout adds
// " | Klaev" to a collection's) and the line under it. Written from Shopify's, which promised free
// delivery on every order; delivery is free with bank transfer only. A collection added in the admin
// gets a plain listing from its name (lib/seo.ts).
export type Listing = { title: string; description: string };

export const HOME_LISTING: Listing = {
  title: "Klaev | Leather Jackets in Pakistan",
  description:
    "Real leather jackets in sheepskin, lambskin and goatskin suede, made in Pakistan. Pay cash on delivery or by bank transfer, delivered across Pakistan.",
};

export const COLLECTION_LISTINGS: Record<string, Listing> = {
  all: {
    title: "Men’s Leather Jackets Online in Pakistan",
    description: "Every Klaev jacket: cropped leather, lambskin and goatskin suede. Real leather, made in Pakistan. Pay cash on delivery or by bank transfer.",
  },
  "cropped-leather-jackets": {
    title: "Men’s Cropped Leather Jackets in Pakistan",
    description: "Men’s cropped jackets cut from full-grain leather, made in Pakistan. Pay cash on delivery or by bank transfer, delivered across Pakistan.",
  },
  "leather-jackets": {
    title: "Men’s Lambskin Leather Jackets in Pakistan",
    description: "Men’s lambskin leather jackets cut from whole hides, made in Pakistan. Pay cash on delivery or by bank transfer, delivered across Pakistan.",
  },
  "suede-jackets": {
    title: "Men’s Suede Jackets in Pakistan",
    description: "Men’s goatskin suede jackets cut from whole hides, made in Pakistan. Pay cash on delivery or by bank transfer, delivered across Pakistan.",
  },
  "leather-belts": {
    title: "Men’s Leather Belts in Pakistan",
    description: "Men’s belts in single-piece cow leather, made in Pakistan. Pay cash on delivery or by bank transfer, delivered across Pakistan.",
  },
};
