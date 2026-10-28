import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RichText } from "@/components/site/rich-text";
import { StorePage } from "@/components/site/store-page";
import { PAGE_DEFAULTS } from "@/data/pages";
import { getPage } from "@/lib/pages";
import { getCodTerms } from "@/lib/settings";
import { fillTerms } from "@/lib/store-terms";

// Shopify's /pages/ addresses. Contact and the size chart have their own routes.
export const dynamicParams = false;
export function generateStaticParams() {
  return PAGE_DEFAULTS.filter((page) => page.kind === "page").map((page) => ({ handle: page.handle }));
}

async function load(handle: string) {
  const [page, terms] = await Promise.all([getPage(handle), getCodTerms()]);
  return page && page.kind === "page" ? { page, terms } : null;
}

export async function generateMetadata({ params }: PageProps<"/pages/[handle]">): Promise<Metadata> {
  const loaded = await load((await params).handle);
  if (!loaded) return {};
  return { title: loaded.page.title, description: fillTerms(loaded.page.description, loaded.terms), alternates: { canonical: `/pages/${loaded.page.handle}` } };
}

export default async function Page({ params }: PageProps<"/pages/[handle]">) {
  const loaded = await load((await params).handle);
  if (!loaded) notFound();
  return (
    <StorePage path={`/pages/${loaded.page.handle}`} title={loaded.page.title}>
      <RichText body={fillTerms(loaded.page.body, loaded.terms)} />
    </StorePage>
  );
}
