import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product/product-card";
import { BreadcrumbData, Breadcrumbs } from "@/components/site/breadcrumbs";
import { getCollection, getCollections } from "@/lib/catalog";

// Listed at build and rendered on first visit, like the product pages. A collection added in the
// admin since the last deploy renders on request; unknown handles are still a real 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  const collections = await getCollections();
  return [{ handle: "all" }, ...collections.map((collection) => ({ handle: collection.handle }))];
}

export async function generateMetadata({ params }: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const collection = await getCollection((await params).handle);
  return collection ? { title: collection.title } : {};
}

// As on the product page, the handle is checked before anything streams so a missing
// collection answers with a real 404 status.
export default async function CollectionPage({ params }: PageProps<"/collections/[handle]">) {
  const collection = await getCollection((await params).handle);
  if (!collection) notFound();

  const trail = [
    { name: "Home", href: "/" },
    { name: collection.title, href: `/collections/${collection.handle}` },
  ];

  return (
    <>
      <BreadcrumbData trail={trail} />
      <Breadcrumbs trail={trail} placement="top" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pt-8 pb-16 md:px-8 md:pt-6">
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
      <Breadcrumbs trail={trail} placement="bottom" />
    </>
  );
}
