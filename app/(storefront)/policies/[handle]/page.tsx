import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RichText } from "@/components/site/rich-text";
import { StorePage } from "@/components/site/store-page";
import { PAGE_DEFAULTS, POLICIES_WRITTEN } from "@/data/pages";
import { getPage } from "@/lib/pages";
import { getCodTerms } from "@/lib/settings";
import { fillTerms } from "@/lib/store-terms";

// Shopify's /policies/ addresses: delivery, exchanges and refunds, privacy, terms.
export const dynamicParams = false;
export function generateStaticParams() {
  return PAGE_DEFAULTS.filter((page) => page.kind === "policy").map((page) => ({ handle: page.handle }));
}

async function load(handle: string) {
  const [page, terms] = await Promise.all([getPage(handle), getCodTerms()]);
  return page && page.kind === "policy" ? { page, terms } : null;
}

export async function generateMetadata({ params }: PageProps<"/policies/[handle]">): Promise<Metadata> {
  const loaded = await load((await params).handle);
  if (!loaded) return {};
  return { title: loaded.page.title, description: fillTerms(loaded.page.description, loaded.terms), alternates: { canonical: `/policies/${loaded.page.handle}` } };
}

export default async function PolicyPage({ params }: PageProps<"/policies/[handle]">) {
  const loaded = await load((await params).handle);
  if (!loaded) notFound();
  return (
    <StorePage path={`/policies/${loaded.page.handle}`} title={loaded.page.title} updated={loaded.page.updatedAt ?? POLICIES_WRITTEN}>
      <RichText body={fillTerms(loaded.page.body, loaded.terms)} />
    </StorePage>
  );
}
