import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { createPostAction } from "@/app/actions/admin-journal";
import { ActionDialog } from "@/components/admin/action-dialog";
import { Field } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { listPosts } from "@/lib/journal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Journal" };

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });

// The journal's articles, drafts first. Published ones are at /blogs/blog/<address>.
export default async function JournalPage() {
  await requireAdmin();
  const rows = await listPosts(await getDb());
  const now = new Date();
  return (
    <>
      <PageHeader title="Journal">
        <ActionDialog action={createPostAction} label="New article" title="A new article" submit="Start writing" variant="default">
          <Field id="new-post-title" name="title" label="Title" placeholder="How to care for lambskin" required autoComplete="off" autoFocus />
        </ActionDialog>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {rows.length === 0 ? (
          <Card className="items-start gap-2 px-6 py-8">
            <p className="font-medium">No articles yet</p>
            <p className="max-w-[60ch] text-sm text-muted-foreground">
              Care guides, fit notes, how a jacket is made. They live at klaev.com/blogs/blog, where the Shopify journal was.
            </p>
          </Card>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Article</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden pr-4 text-right sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((post) => {
                  const scheduled = post.status === "published" && post.publishedAt !== null && post.publishedAt > now;
                  return (
                    <TableRow key={post.id} className="relative border-hairline">
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="aspect-4/3 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                            {post.coverSrc && post.coverWidth && post.coverHeight ? (
                              <Image src={post.coverSrc} width={post.coverWidth} height={post.coverHeight} alt="" sizes="56px" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <Link href={`/admin/content/journal/${post.id}`} className="truncate font-medium after:absolute after:inset-0">
                              {post.title}
                            </Link>
                            <span className="truncate text-xs text-muted-foreground">/blogs/blog/{post.handle}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.status === "published" && !scheduled ? "secondary" : "outline"} className={cn(post.status === "draft" && "text-muted-foreground")}>
                          {post.status === "draft" ? "Draft" : scheduled ? "Scheduled" : "Published"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden pr-4 text-right text-muted-foreground tabular-nums sm:table-cell">
                        {post.publishedAt ? day.format(post.publishedAt) : "Not yet"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
