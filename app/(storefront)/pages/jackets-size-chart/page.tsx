import type { Metadata } from "next";
import Link from "next/link";

import { SizeNotes, SizeTable } from "@/components/product/size-guide";
import { StorePage } from "@/components/site/store-page";
import { getCollections } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Men's Jacket Size Chart Pakistan",
  description: "Find your fit with the Klaev men's leather and suede jacket size chart. Measurements in inches and centimeters. Free delivery on bank transfer.",
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
    <StorePage path="/pages/jackets-size-chart" title="Jackets Size Chart" lead="Sizes go by chest. Between two sizes, size up to layer.">
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
              <SizeTable chart={chart.guide.chart} />
            </div>
            <SizeNotes notes={chart.guide.chart.notes} className="flex flex-col gap-1 text-sm text-muted-foreground" />
          </section>
        ))}
      </div>
    </StorePage>
  );
}
