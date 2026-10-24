import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import type { Product } from "@/lib/catalog";

const COUNT_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six"];

function stockLine(product: Product) {
  const sizes = product.variants.filter((variant) => variant.available && variant.size).map((variant) => variant.size);
  return sizes.length ? `${sizes.join(", ")} in stock` : "Sold out";
}

// The lead line's colours, right under the hero, for shoppers who already know they want one.
export function ColourCards({ products }: { products: Product[] }) {
  return (
    <section
      id="colours"
      aria-labelledby="colours-title"
      className="mx-auto flex max-w-6xl scroll-mt-16 flex-col gap-5 px-5 pt-12 md:px-8 md:pt-16"
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
          return (
            <li key={product.handle}>
              <Link href={`/products/${product.handle}`} prefetch className="group flex flex-col gap-2">
                {image ? (
                  <ViewTransition name={`product-photo-${product.handle}`} share="morph" default="none">
                    <Image
                      src={image.src}
                      width={image.width}
                      height={image.height}
                      alt=""
                      sizes="(min-width: 768px) 33vw, 33vw"
                      className="aspect-4/5 w-full rounded-xl bg-muted object-cover transition-opacity group-hover:opacity-90 md:rounded-2xl"
                    />
                  </ViewTransition>
                ) : null}
                <span className="sr-only">{product.title}</span>
                <span className="flex flex-col px-0.5">
                  <span className="text-sm font-medium md:text-base">{product.colour}</span>
                  <span className="text-xs text-muted-foreground md:text-sm">{stockLine(product)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
