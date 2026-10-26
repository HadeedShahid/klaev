import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { pill } from "@/lib/styles";

import { HeroPhotos, type HeroColour } from "./hero-photos";

// Headline on top, then the studio photos of the cropped jackets, with a colour picker on the photo.
export function Hero({ price, colours }: { price: string; colours: HeroColour[] }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-5 pt-8 pb-6 text-center md:pt-14 md:pb-10">
        <h1
          id="hero-title"
          className="text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl"
        >
          Cropped leather jackets.
        </h1>
        <p className="text-lg text-balance text-muted-foreground md:text-xl">Full-grain sheepskin, cut to the waist.</p>
        <p data-testid="hero-price" className="font-medium tabular-nums">
          {price}
        </p>
        <div className="flex items-center gap-6 pt-2">
          <Link href="/collections/cropped-leather-jackets" prefetch className={pill}>
            Shop cropped
          </Link>
          <a
            href="#colours"
            className="group inline-flex h-12 items-center gap-0.5 text-[0.9375rem] font-medium hover:underline"
          >
            See the colours
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
        </div>
      </div>
      <HeroPhotos colours={colours} />
    </section>
  );
}
