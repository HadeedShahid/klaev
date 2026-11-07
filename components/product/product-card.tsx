import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import type { Product } from "@/lib/catalog";
import { isRestocking } from "@/lib/restock";
import { formatRating } from "@/lib/review-rules";
import { Price } from "./price";
import { Star } from "./stars";

// A list's first cards can load at once and its first photo ahead of the rest (`loading`,
// `fetchPriority`): the rest of a grid waits until it's scrolled near.
export function ProductCard({
  product,
  sizes,
  loading,
  fetchPriority,
  rating = null,
}: {
  product: Product;
  sizes: string;
  loading?: "eager";
  fetchPriority?: "high";
  // The line's rating, as on the product page; none until it has reviews.
  rating?: { average: number; count: number } | null;
}) {
  const image = product.images[0];
  const soldOut = product.variants.every((variant) => !variant.available);
  const price = soldOut ? (
    isRestocking(product) ? (
      <span className="font-medium text-foreground">Restocking soon</span>
    ) : (
      "Sold out"
    )
  ) : (
    <Price price={product.price} compareAt={product.compareAtPrice} />
  );

  return (
    <Link href={`/products/${product.handle}`} prefetch className="group flex flex-col gap-3">
      {image ? (
        <ViewTransition name={`product-photo-${product.handle}`} share="morph" default="none">
          <Image
            src={image.src}
            width={image.width}
            height={image.height}
            alt={image.alt}
            sizes={sizes}
            loading={loading}
            fetchPriority={fetchPriority}
            className="aspect-4/5 w-full rounded-2xl bg-muted object-cover transition-opacity group-hover:opacity-90"
          />
        </ViewTransition>
      ) : null}
      {/* Once the line has reviews, its rating shares the price's line, so the card grows no taller:
          one star, the average and the count. The whole card is the link. Until then the card is
          exactly as it was. */}
      <span className="flex flex-col gap-0.5 px-0.5">
        <span className="text-[0.9375rem] leading-snug font-medium text-balance">{product.title}</span>
        {rating ? (
          <span className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{price}</span>
            <span className="flex shrink-0 items-center gap-1 tabular-nums">
              <Star filled className="size-3 self-center" />
              <span className="sr-only">Rated</span>
              <span className="font-medium">{formatRating(rating.average)}</span>
              <span className="text-muted-foreground">
                ({rating.count}
                <span className="sr-only"> {rating.count === 1 ? "review" : "reviews"}</span>)
              </span>
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{price}</span>
        )}
      </span>
    </Link>
  );
}
