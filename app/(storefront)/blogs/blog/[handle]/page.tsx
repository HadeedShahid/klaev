import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BreadcrumbData, Breadcrumbs } from "@/components/site/breadcrumbs";
import { getPublishedPost } from "@/lib/journal";
import { parseBody, readingMinutes } from "@/lib/journal-body";
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
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
      <div className="flex flex-col gap-5 text-[1.0625rem] leading-relaxed">
        {parseBody(post.body).map((block, index) =>
          block.kind === "heading" ? (
            <h2 key={index} className="pt-3 text-2xl font-semibold tracking-tight text-balance">
              {block.text}
            </h2>
          ) : block.kind === "list" ? (
            <ul key={index} className="flex list-disc flex-col gap-2 pl-5 marker:text-muted-foreground">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={index} className="text-pretty">
              {block.text}
            </p>
          ),
        )}
      </div>
      <Breadcrumbs trail={trail} placement="bottom" className="px-0" />
    </article>
  );
}
