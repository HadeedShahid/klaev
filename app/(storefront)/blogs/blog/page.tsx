import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { listPublished } from "@/lib/journal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Notes from Klaev on leather, fit and care: how to choose a jacket, and how to keep it for years.",
  alternates: { canonical: "/blogs/blog" },
};

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric" });

// Every published article, newest first.
export default async function JournalPage() {
  const posts = await listPublished();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5 pt-8 pb-16 md:px-8 md:pt-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight md:text-5xl">Journal</h1>
        <p className="max-w-[52ch] text-muted-foreground text-pretty">Notes on leather, fit and care.</p>
      </div>
      {posts.length === 0 ? (
        <p className="rounded-2xl bg-muted p-6 text-muted-foreground">Nothing here yet. The first articles are on their way.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/blogs/blog/${post.handle}`} className="group flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:gap-6">
                {post.coverSrc && post.coverWidth && post.coverHeight ? (
                  <Image
                    src={post.coverSrc}
                    width={post.coverWidth}
                    height={post.coverHeight}
                    alt={post.coverAlt ?? ""}
                    sizes="(min-width: 640px) 240px, 100vw"
                    className="aspect-4/3 w-full shrink-0 rounded-xl bg-muted object-cover sm:w-60"
                  />
                ) : null}
                <div className="flex flex-col gap-1.5">
                  {post.publishedAt ? <p className="text-sm text-muted-foreground tabular-nums">{day.format(post.publishedAt)}</p> : null}
                  <h2 className="text-xl font-semibold tracking-tight text-balance group-hover:underline group-hover:underline-offset-[0.2em]">{post.title}</h2>
                  {post.excerpt ? <p className="text-muted-foreground text-pretty">{post.excerpt}</p> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
