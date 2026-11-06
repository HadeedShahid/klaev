import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import type { Product } from "@/lib/catalog";
import { isRestocking } from "@/lib/restock";
import { Price } from "./price";

// A list's first cards can load at once and its first photo ahead of the rest (`loading`,
// `fetchPriority`): the rest of a grid waits until it's scrolled near.
export function ProductCard({
  product,
  sizes,
  loading,
  fetchPriority,
}: {
  product: Product;
  sizes: string;
  loading?: "eager";
  fetchPriority?: "high";
}) {
  const image = product.images[0];
  const soldOut = product.variants.every((variant) => !variant.available);

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
      <span className="flex flex-col gap-0.5 px-0.5">
        <span className="text-[0.9375rem] leading-snug font-medium text-balance">{product.title}</span>
        <span className="text-sm text-muted-foreground">
          {soldOut ? (isRestocking(product) ? <span className="font-medium text-foreground">Restocking soon</span> : "Sold out") : <Price price={product.price} compareAt={product.compareAtPrice} />}
        </span>
      </span>
    </Link>
  );
}
