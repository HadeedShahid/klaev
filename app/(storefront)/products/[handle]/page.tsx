import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Assurances } from "@/components/product/assurances";
import { Gallery } from "@/components/product/gallery";
import { PaymentOptions } from "@/components/product/payment-options";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetails } from "@/components/product/product-details";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { SizeGuide } from "@/components/product/size-guide";
import { getProduct, getProducts, getRelatedProducts } from "@/lib/catalog";
import { formatPKR } from "@/lib/money";
import { codSummary } from "@/lib/payment";
import { sizeMeasurement } from "@/lib/sizing";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata({ params }: PageProps<"/products/[handle]">): Promise<Metadata> {
  const product = await getProduct((await params).handle);
  if (!product) return {};
  return {
    title: product.title,
    description: product.tagline ? `${product.tagline} ${formatPKR(product.price)}.` : undefined,
    openGraph: { images: product.images.slice(0, 1).map((image) => image.src) },
  };
}

// The page never reads the URL itself, so its shell is shared by every product. The URL is read
// inside the boundary; known products are still prerendered in full, and prefetched links resolve them.
export default function ProductPage({ params }: PageProps<"/products/[handle]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductView params={params} />
    </Suspense>
  );
}

async function ProductView({ params }: Pick<PageProps<"/products/[handle]">, "params">) {
  const product = await getProduct((await params).handle);
  if (!product) notFound();

  const related = await getRelatedProducts(product.handle);
  const sized = product.variants.filter((variant) => variant.size !== null);
  const sizes = sized.map((variant) => ({
    variantId: variant.id,
    size: variant.size as string,
    measurement: sizeMeasurement(product.sizeGuide, variant.size as string),
    available: variant.available,
  }));
  const single = sized.length === 0 ? product.variants[0] : null;

  return (
    <div className="pb-28 md:pb-0">
      <div className="mx-auto max-w-6xl md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-10 md:px-8 md:pt-8">
        <Gallery handle={product.handle} images={product.images} />

        <div className="flex flex-col gap-8 px-5 pt-5 md:sticky md:top-20 md:self-start md:px-0 md:pt-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance md:text-4xl">
              {product.title}
            </h1>
            <p data-testid="product-price" className="text-xl font-medium tabular-nums">
              {formatPKR(product.price)}
            </p>
            {product.tagline ? <p className="text-muted-foreground">{product.tagline}</p> : null}
          </div>

          <PurchasePanel
            price={formatPKR(product.price)}
            confirmNow={formatPKR(codSummary(product.price).advance)}
            sizes={sizes}
            singleVariant={single ? { variantId: single.id, available: single.available } : null}
            sizeGuide={product.sizeGuide ? <SizeGuide guide={product.sizeGuide} /> : null}
          />

          <PaymentOptions id={product.handle} subtotal={product.price} />
          <Assurances productTitle={product.title} />
          <ProductDetails intro={product.intro} sections={product.sections} />
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby={`more-from-klaev-${product.handle}`} className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:px-8">
          <h2 id={`more-from-klaev-${product.handle}`} className="pb-5 text-xl font-semibold tracking-tight">
            More from Klaev
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((item) => (
              <li key={item.handle}>
                <ProductCard product={item} sizes="(min-width: 768px) 25vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-6xl md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-10 md:px-8 md:pt-8">
      <div className="aspect-4/5 w-full animate-pulse bg-muted md:rounded-2xl" />
      <div className="flex flex-col gap-3 px-5 pt-6 md:px-0 md:pt-0">
        <div className="h-8 w-4/5 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-1/3 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
