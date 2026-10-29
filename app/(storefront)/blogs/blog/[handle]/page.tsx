import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BreadcrumbData, Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { getPublishedPost } from "@/lib/journal";
import { RichText } from "@/components/site/rich-text";
import { readingMinutes } from "@/lib/journal-body";
import { SITE_OPEN_GRAPH } from "@/lib/seo";
import { STORE } from "@/lib/store";

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric" });

export async function generateMetadata({ params }: PageProps<"/blogs/blog/[handle]">): Promise<Metadata> {
  const post = await getPublishedPost((await params).handle);
  if (!post) return {};
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  return {
    title: post.seoTitle ?? post.title,
    description,
    alternates: { canonical: `/blogs/blog/${post.handle}` },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      url: `/blogs/blog/${post.handle}`,
      type: "article",
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverSrc ? [{ url: post.coverSrc, width: post.coverWidth ?? undefined, height: post.coverHeight ?? undefined, alt: post.coverAlt ?? undefined }] : undefined,
    },
  };
}

// One article. The address is checked before anything streams, so an unknown or draft one is a real 404.
export default async function ArticlePage({ params }: PageProps<"/blogs/blog/[handle]">) {
  const post = await getPublishedPost((await params).handle);
  if (!post) notFound();
  const trail = [
    { name: "Home", href: "/" },
    { name: "Journal", href: "/blogs/blog" },
    { name: post.title, href: `/blogs/blog/${post.handle}` },
  ];
  const structured = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.coverSrc ?? undefined,
    author: { "@type": "Organization", name: "Klaev", url: STORE.siteUrl },
    mainEntityOfPage: `${STORE.siteUrl}/blogs/blog/${post.handle}`,
  };

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pt-6 pb-16 md:px-8 md:pt-10">
      <BreadcrumbData trail={trail} />
      <JsonLd data={structured} />
      <Breadcrumbs trail={trail} placement="top" className="px-0 pt-0" />
      <header className="flex flex-col gap-3">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-balance md:text-5xl">{post.title}</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {post.publishedAt ? day.format(post.publishedAt) : null}
          {post.publishedAt ? " · " : null}
          {readingMinutes(post.body)} min read
        </p>
      </header>
      {post.coverSrc && post.coverWidth && post.coverHeight ? (
        <Image
          src={post.coverSrc}
          width={post.coverWidth}
          height={post.coverHeight}
          alt={post.coverAlt ?? ""}
          sizes="(min-width: 768px) 672px, 100vw"
          priority
          className="w-full rounded-2xl bg-muted object-cover"
        />
      ) : null}
      <RichText body={post.body} />
      <Breadcrumbs trail={trail} placement="bottom" className="px-0" />
    </article>
  );
}
