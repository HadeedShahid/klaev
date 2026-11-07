import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import type { Product } from "@/lib/catalog";
import { Star } from "@/components/product/stars";
import { isRestocking } from "@/lib/restock";
import { formatRating } from "@/lib/review-rules";

const COUNT_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six"];

// What's in stock ("S, M in stock", or "Sold out"), and "Restocking soon" beneath it while a new batch
// is on order (lib/restock.ts). A colour that's out entirely with a batch coming says only that.
function stockLines(product: Product) {
  const sizes = product.variants.filter((variant) => variant.available && variant.size).map((variant) => variant.size);
  const soon = isRestocking(product);
  const inStock = sizes.length ? `${sizes.join(", ")} in stock` : soon ? null : "Sold out";
  return { inStock, soon };
}

// The lead line's colours, right under the hero, for shoppers who already know they want one.
// See the colours (ScrollLink) lands on the heading itself: the page's scroll padding already clears
// the header, and the negative scroll margin cancels the section's top padding, so the cards and
// their names fit a laptop screen below it. tabIndex lets the link hand focus to the section.
// `rating` is the line's, shared by every colour (same cut, same leather); none until it has reviews.
export function ColourCards({ products, rating = null }: { products: Product[]; rating?: { average: number; count: number } | null }) {
  return (
    <section
      id="colours"
      tabIndex={-1}
      aria-labelledby="colours-title"
      className="mx-auto flex max-w-6xl -scroll-mt-12 flex-col gap-5 px-5 pt-12 outline-none md:-scroll-mt-16 md:px-8 md:pt-16"
    >
      <div className="flex flex-col gap-1 text-center">
        <h2 id="colours-title" className="text-[1.75rem] leading-tight font-semibold tracking-tight md:text-4xl">
          {COUNT_WORDS[products.length] ?? products.length} colours.
        </h2>
        <p className="text-muted-foreground">Same cut, same leather.</p>
      </div>
      <ul className="grid grid-cols-3 gap-2 md:gap-5">
        {products.map((product) => {
          const image = product.images[0];
          const stock = stockLines(product);
          return (
            <li key={product.handle}>
              <Link href={`/products/${product.handle}`} prefetch className="group flex flex-col gap-2">
                {image ? (
                  <ViewTransition name={`product-photo-${product.handle}`} share="morph" default="none">
                    <Image
                      src={image.src}
                      width={image.width}
                      height={image.height}
                      alt={image.alt}
                      sizes="(min-width: 768px) 33vw, 33vw"
                      className="aspect-4/5 w-full rounded-xl bg-muted object-cover transition-opacity group-hover:opacity-90 md:rounded-2xl"
                    />
                  </ViewTransition>
                ) : null}
                <span className="sr-only">{product.title}</span>
                {/* The line's rating on each card: under the stock line on phones, where three cards
                    share 390px, and at the right of the colour's name from 768px. Until the line has
                    reviews, the card's words are exactly as they were. */}
                {rating ? (
                  <span className="flex flex-col px-0.5 md:flex-row md:items-start md:justify-between md:gap-3">
                    <span className="flex flex-col">
                      <span className="text-sm font-medium md:text-base">{product.colour}</span>
                      {stock.inStock ? <span className="text-xs text-muted-foreground md:text-sm">{stock.inStock}</span> : null}
                      {stock.soon ? <span className="text-xs font-medium md:text-sm">Restocking soon</span> : null}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs tabular-nums md:mt-0 md:pt-0.5 md:text-sm">
                      <Star filled className="size-3 self-center md:size-3.5" />
                      <span className="sr-only">Rated</span>
                      <span className="font-medium">{formatRating(rating.average)}</span>
                      <span className="text-muted-foreground">
                        ({rating.count}
                        <span className="sr-only"> {rating.count === 1 ? "review" : "reviews"}</span>)
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="flex flex-col px-0.5">
                    <span className="text-sm font-medium md:text-base">{product.colour}</span>
                    {stock.inStock ? <span className="text-xs text-muted-foreground md:text-sm">{stock.inStock}</span> : null}
                    {stock.soon ? <span className="text-xs font-medium md:text-sm">Restocking soon</span> : null}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
