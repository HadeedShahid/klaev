import type { Product } from "@/lib/catalog";

// The tag the owner puts on a product, in the admin, once a new batch of it is on order.
export const RESTOCK_TAG = "restocking";

// "Restocking soon" shows while a product carries the tag and any size of it is sold out. Once
// every size is back the notice goes by itself, even if the tag is still there. A sold-out product
// without the tag just reads "Sold out": nothing is promised that isn't on order.
export function isRestocking(product: Pick<Product, "tags" | "variants">) {
  const tagged = product.tags.some((tag) => tag.trim().toLowerCase() === RESTOCK_TAG);
  return tagged && product.variants.some((variant) => !variant.available);
}
