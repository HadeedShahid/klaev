import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Assurances } from "@/components/product/assurances";
import { Gallery } from "@/components/product/gallery";
import { PaymentOptions } from "@/components/product/payment-options";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetails } from "@/components/product/product-details";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ReviewsSection } from "@/components/product/reviews-section";
import { Star } from "@/components/product/stars";
import { SizeGuide } from "@/components/product/size-guide";
import { BreadcrumbData, Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { MetaEvent } from "@/components/site/meta-event";
import { getCollection, getProduct, getProducts, getRelatedProducts, hiddenProductRedirect, type Product } from "@/lib/catalog";
import { Price } from "@/components/product/price";
import { formatPKR } from "@/lib/money";
import { codSummary } from "@/lib/payment";
import { isRestocking } from "@/lib/restock";
import { formatRating } from "@/lib/review-rules";
import { getProductReviews } from "@/lib/reviews";
import { productData, sharedImage, SITE_OPEN_GRAPH } from "@/lib/seo";
import { getCodTerms } from "@/lib/settings";
import { sizeMeasurement } from "@/lib/sizing";

// Live handles are listed at build so their pages never expire. Deploys don't upload the built
// pages (AGENTS.md), so each one renders on the Worker from the database on its first visit after
// a deploy and is served from the R2 cache after that. A product created in the admin since the
// last deploy isn't in that list, so its page renders on request until the next deploy lists it.
// The page checks the handle first either way: an unknown one is a real 404, and a hidden product's
// (a draft, like the belts, or an archived one) redirects to what's on sale.
export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata({ params }: PageProps<"/products/[handle]">): Promise<Metadata> {
  const product = await getProduct((await params).handle);
  if (!product) return {};
  // One address per product, whatever ?variant= or campaign tags a link carried.
  const canonical = `/products/${product.handle}`;
  return {
    // Search titles carried over from Shopify are complete titles, so they skip the "| Klaev" template.
    title: product.seoTitle ? { absolute: product.seoTitle } : product.title,
    description:
      product.seoDescription ?? (product.tagline ? `${product.tagline} ${formatPKR(product.price)}.` : undefined),
    alternates: { canonical },
    openGraph: { ...SITE_OPEN_GRAPH, url: canonical, ...(product.images[0] ? { images: [sharedImage(product.images[0])] } : {}) },
  };
}

// The handle is checked before anything streams, so unknown handles answer with a real 404 status,
// and a hidden product's with a real redirect to what's on sale. Inside the boundary the response
// would already have gone out as 200.
export default async function ProductPage({ params }: PageProps<"/products/[handle]">) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) {
    const elsewhere = await hiddenProductRedirect(handle);
    if (elsewhere) redirect(elsewhere);
    notFound();
  }

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductView product={product} />
    </Suspense>
  );
}

async function ProductView({ product }: { product: Product }) {
  const terms = await getCodTerms();
  const [related, collection, reviews] = await Promise.all([
    getRelatedProducts(product.handle),
    getCollection(product.collection),
    getProductReviews(product),
  ]);
  const trail = [
    { name: "Home", href: "/" },
    ...(collection ? [{ name: collection.title, href: `/collections/${collection.handle}` }] : []),
    { name: product.title, href: `/products/${product.handle}` },
  ];
  const sized = product.variants.filter((variant) => variant.size !== null);
  const sizes = sized.map((variant) => ({
    variantId: variant.id,
    size: variant.size as string,
    measurement: sizeMeasurement(product.sizeGuide, variant.size as string),
    available: variant.available,
  }));
  const single = sized.length === 0 ? product.variants[0] : null;

  return (
    <div>
      <JsonLd data={productData(product, reviews.own)} />
      {/* Next's metadata refuses og:type "product", so these three go in by hand. */}
      <meta property="og:type" content="product" />
      <meta property="og:price:amount" content={product.price.toLocaleString("en-US")} />
      <meta property="og:price:currency" content="PKR" />
      <MetaEvent
        key={product.handle}
        name="ViewContent"
        data={{ content_ids: [product.handle], content_type: "product_group", content_name: product.title, value: product.price }}
      />
      <BreadcrumbData trail={trail} />
      <Breadcrumbs trail={trail} placement="top" />
      <div className="mx-auto max-w-6xl md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-10 md:px-8 md:pt-6">
        <Gallery handle={product.handle} title={product.title} images={product.images} />

        <div className="flex flex-col gap-8 px-5 pt-5 md:sticky md:top-20 md:self-start md:px-0 md:pt-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight text-balance md:text-4xl">
              {product.title}
            </h1>
            {/* The rating beside the price, a quiet link like the hero's "See the colours": one star, the
                average and the count, a chevron; the underline comes only on hover. Until the line has
                reviews, the price stands alone exactly as before. */}
            {reviews.summary ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p data-testid="product-price" className="text-xl font-medium">
                  <Price price={product.price} compareAt={product.compareAtPrice} />
                </p>
                <a href="#reviews" className="group -my-3 inline-flex min-h-11 items-center gap-1.5 text-sm">
                  <Star filled />
                  <span className="sr-only">Rated</span>
                  <span className="font-medium tabular-nums">{formatRating(reviews.summary.average)}</span>
                  <span className="text-muted-foreground underline-offset-[0.2em] group-hover:text-foreground group-hover:underline">
                    {reviews.summary.count === 1 ? "1 review" : `${reviews.summary.count} reviews`}
                  </span>
                  <ChevronRight
                    className="-ml-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </a>
              </div>
            ) : (
              <p data-testid="product-price" className="text-xl font-medium">
                <Price price={product.price} compareAt={product.compareAtPrice} />
              </p>
            )}
            {product.tagline ? <p className="text-muted-foreground">{product.tagline}</p> : null}
          </div>

          <PurchasePanel
            price={formatPKR(product.price)}
            confirmNow={formatPKR(codSummary(product.price, { advance: terms.codAdvance, deliveryFee: terms.codDeliveryFee }).advance)}
            sizes={sizes}
            singleVariant={single ? { variantId: single.id, available: single.available } : null}
            sizeGuide={product.sizeGuide ? <SizeGuide guide={product.sizeGuide} /> : null}
            restocking={isRestocking(product)}
          />

          <PaymentOptions id={product.handle} subtotal={product.price} terms={terms} />
          <Assurances productTitle={product.title} />
          <ProductDetails intro={product.intro} sections={product.sections} />
        </div>
      </div>

      <ReviewsSection handle={product.handle} reviews={reviews} />

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
      <Breadcrumbs trail={trail} placement="bottom" />
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
