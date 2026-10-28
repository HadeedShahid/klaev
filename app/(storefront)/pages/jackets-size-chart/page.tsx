import type { Metadata } from "next";
import Link from "next/link";

import { SizeTable } from "@/components/product/size-guide";
import { StorePage } from "@/components/site/store-page";
import { getCollections } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Jackets size chart",
  description: "Every Klaev jacket's sizes by chest measurement, in inches.",
  alternates: { canonical: "/pages/jackets-size-chart" },
};

// Each line's sizes, from the same size guides the product pages show. Jackets that share a guide
// share a table.
export default async function SizeChartPage() {
  const collections = await getCollections();
  const charts = collections.flatMap((collection) => {
    const groups = new Map<string, { guide: NonNullable<(typeof collection.items)[number]["sizeGuide"]>; products: { handle: string; title: string }[] }>();
    for (const product of collection.items) {
      if (!product.sizeGuide) continue;
      const key = JSON.stringify(product.sizeGuide);
      const group = groups.get(key) ?? { guide: product.sizeGuide, products: [] };
      group.products.push({ handle: product.handle, title: product.title });
      groups.set(key, group);
    }
    return [...groups.values()].map((group, index) => ({ key: `${collection.handle}-${index}`, title: collection.title, ...group }));
  });

  return (
    <StorePage path="/pages/jackets-size-chart" title="Jackets size chart" lead="Sizes go by chest. Between two sizes, size up to layer.">
      <div className="flex flex-col gap-10">
        {charts.map((chart) => (
          <section key={chart.key} aria-labelledby={`chart-${chart.key}`} className="flex flex-col gap-3">
            <h2 id={`chart-${chart.key}`} className="text-xl font-semibold tracking-tight">
              {chart.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {chart.products.map((product, index) => (
                <span key={product.handle}>
                  {index > 0 ? ", " : null}
                  <Link href={`/products/${product.handle}`} className="underline underline-offset-[0.2em] hover:no-underline">
                    {product.title}
                  </Link>
                </span>
              ))}
            </p>
            <div className="rounded-2xl bg-muted px-4 py-2">
              <SizeTable guide={chart.guide} />
            </div>
            <p className="text-sm text-muted-foreground">{chart.guide.note}</p>
          </section>
        ))}
      </div>
    </StorePage>
  );
}
