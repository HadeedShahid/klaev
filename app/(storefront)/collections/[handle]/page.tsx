import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductCard } from "@/components/product/product-card";
import { getCollection, getCollections } from "@/lib/catalog";

export async function generateStaticParams() {
  const collections = await getCollections();
  return [{ handle: "all" }, ...collections.map((collection) => ({ handle: collection.handle }))];
}

export async function generateMetadata({ params }: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const collection = await getCollection((await params).handle);
  return collection ? { title: collection.title } : {};
}

// Same shape as the product page: the URL is read inside the boundary, so the shell is shared.
export default function CollectionPage({ params }: PageProps<"/collections/[handle]">) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <CollectionView params={params} />
    </Suspense>
  );
}

async function CollectionView({ params }: Pick<PageProps<"/collections/[handle]">, "params">) {
  const collection = await getCollection((await params).handle);
  if (!collection) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 pt-8 pb-16 md:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">{collection.title}</h1>
        <p className="text-sm text-muted-foreground">
          {collection.items.length} {collection.items.length === 1 ? "piece" : "pieces"}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
        {collection.items.map((product) => (
          <li key={product.handle}>
            <ProductCard product={product} sizes="(min-width: 768px) 25vw, 50vw" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollectionSkeleton() {
  return (
    <div aria-hidden className="mx-auto flex max-w-6xl flex-col gap-8 px-5 pt-8 pb-16 md:px-8">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-4/5 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
