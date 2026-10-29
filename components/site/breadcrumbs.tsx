import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { STORE } from "@/lib/store";
import { cn } from "@/lib/utils";

import { JsonLd } from "./json-ld";

export type Crumb = { name: string; href: string };

// Where the page sits in the shop. From tablets up the trail leads the page, top left; on phones it
// closes the page, above the footer, so the first screen stays the product's. Render it once with
// each placement; only one shows at a time. The last crumb is the page itself. Inside a column that
// has its own padding (a journal article), `className` drops the trail's.
export function Breadcrumbs({ trail, placement, className }: { trail: Crumb[]; placement: "top" | "bottom"; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "mx-auto w-full max-w-6xl text-sm",
        placement === "top" ? "hidden px-8 pt-6 md:block" : "border-t border-hairline px-5 py-5 md:hidden",
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {trail.map((crumb, index) => {
          const current = index === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {current ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link href={crumb.href} className="text-muted-foreground transition-colors hover:text-foreground">
                    {crumb.name}
                  </Link>
                  <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.6} aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The same trail for search results (schema.org BreadcrumbList), with full URLs on the real domain.
export function BreadcrumbData({ trail }: { trail: Crumb[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.href, STORE.siteUrl).toString(),
    })),
  };
  return <JsonLd data={data} />;
}
