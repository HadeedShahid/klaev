import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Star } from "@/components/product/stars";
import { formatRating } from "@/lib/review-rules";
import { pill } from "@/lib/styles";

import { HeroPhotos, type HeroColour } from "./hero-photos";
import { ScrollLink } from "./scroll-link";

// Headline on top, then the studio photos of the cropped jackets, with a colour picker on the photo.
// Once the home page has its reviews chapter, the rating sits on the price's line and glides there.
export function Hero({ price, colours, rating }: { price: string; colours: HeroColour[]; rating: { average: number; count: number } | null }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-5 pt-8 pb-6 text-center md:pt-14 md:pb-10">
        {/* Search reads the h1, as it did on Shopify, where it was hidden too. Shoppers read the headline. */}
        <h1 className="sr-only">{"Klaev. Men's leather jackets in Pakistan."}</h1>
        <p
          id="hero-title"
          className="text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl"
        >
          Cropped leather jackets.
        </p>
        <p className="text-lg text-balance text-muted-foreground md:text-xl">Full-grain sheepskin, cut to the waist.</p>
        {/* Until there are reviews, the price line is exactly as it was. */}
        {rating ? (
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 tabular-nums">
            <span data-testid="hero-price" className="font-medium">
              {price}
            </span>
            <span aria-hidden className="h-4 w-px bg-border" />
            {/* A quiet link, as beside a product's price: no underline until hover, then a chevron. */}
            <ScrollLink to="reviews" className="group -my-3 inline-flex min-h-11 items-center gap-1.5 text-sm">
              <Star filled className="size-3.5" />
              <span className="sr-only">Rated</span>
              <span className="font-medium">{formatRating(rating.average)}</span>
              <span className="text-muted-foreground underline-offset-[0.2em] group-hover:text-foreground group-hover:underline">
                {rating.count === 1 ? "1 review" : `${rating.count} reviews`}
              </span>
              <ChevronRight
                className="-ml-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                strokeWidth={1.8}
                aria-hidden
              />
            </ScrollLink>
          </p>
        ) : (
          <p data-testid="hero-price" className="font-medium tabular-nums">
            {price}
          </p>
        )}
        <div className="flex items-center gap-6 pt-2">
          <Link href="/collections/cropped-leather-jackets" prefetch className={pill}>
            Shop cropped
          </Link>
          <ScrollLink
            to="colours"
            className="group inline-flex h-12 items-center gap-0.5 text-[0.9375rem] font-medium hover:underline"
          >
            See the colours
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </ScrollLink>
        </div>
      </div>
      <HeroPhotos colours={colours} />
    </section>
  );
}
