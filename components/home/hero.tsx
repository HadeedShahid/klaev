import { ChevronRight } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";

import heroDesktop from "@/assets/images/hero-cropped-black-desktop.webp";
import heroMobile from "@/assets/images/hero-cropped-black-mobile.webp";
import { pill } from "@/lib/styles";

const alt = "Black cropped leather jacket, worn against a sunlit stone wall";

// One campaign photo, cropped for each screen: portrait on phones, landscape from tablets up.
const {
  props: { srcSet: desktopSrcSet },
} = getImageProps({ alt, src: heroDesktop, sizes: "100vw" });
const {
  props: { srcSet: mobileSrcSet, ...image },
} = getImageProps({ alt, src: heroMobile, sizes: "100vw", loading: "eager", fetchPriority: "high" });

export function Hero({ price }: { price: string }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-5 pt-10 pb-8 text-center md:pt-16 md:pb-10">
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
      <picture>
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
        <img
          {...image}
          srcSet={mobileSrcSet}
          alt={alt}
          className="aspect-5/6 w-full bg-muted object-cover md:aspect-video md:object-[50%_25%]"
        />
      </picture>
    </section>
  );
}
