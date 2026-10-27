import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePostAction, removeCoverAction, savePostAction, uploadPostCover } from "@/app/actions/admin-journal";
import { ActionDialog } from "@/components/admin/action-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { SaveForm } from "@/components/admin/save-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { getPost } from "@/lib/journal";
import { STORE } from "@/lib/store";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/admin/content/journal/[id]">): Promise<Metadata> {
  const post = await getPost(await getDb(), Number((await params).id));
  return { title: post?.title ?? "Article" };
}

const FORM = "post-form";
const karachiDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(date);

// One article: the words, the cover, when it's published, and how search engines show it. Fields
// sit across the cards and save together from the header, like a product.
export default async function PostPage({ params }: PageProps<"/admin/content/journal/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const post = await getPost(await getDb(), id);
  if (!post) notFound();
  const field = (name: string) => `post-${id}-${name}`;
  const live = post.status === "published" && post.publishedAt !== null && post.publishedAt <= new Date();

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/admin/content/journal" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Journal
            </Link>
            <span className="max-w-[40vw] truncate">{post.title}</span>
          </span>
        }
      >
        {live ? (
          <a href={`/blogs/blog/${post.handle}`} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            View on the store
          </a>
        ) : null}
        <SaveForm id={FORM} action={savePostAction} hidden={{ postId: id }} />
      </PageHeader>

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("title")} className="text-sm font-medium">
                  Title
                </label>
                <input id={field("title")} form={FORM} name="title" defaultValue={post.title} required className={adminField} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("excerpt")} className="text-sm font-medium">
                  Summary
                </label>
                <textarea id={field("excerpt")} form={FORM} name="excerpt" rows={2} defaultValue={post.excerpt ?? ""} className={cn(adminField, "h-auto resize-y py-2 leading-normal")} />
                <p className="text-xs text-muted-foreground">One or two sentences under the title on the journal page.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("body")} className="text-sm font-medium">
                  Article
                </label>
                <textarea
                  id={field("body")}
                  form={FORM}
                  name="body"
                  rows={18}
                  defaultValue={post.body}
                  className={cn(adminField, "h-auto resize-y py-2 text-[0.9375rem] leading-relaxed")}
                />
                <p className="text-xs text-muted-foreground">
                  A blank line starts a new paragraph. Start a line with ## for a heading, or with - for a list. No dashes in sentences; PKR for prices.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
              <CardDescription>Empty fields use the title and the summary.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-xl border border-hairline p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {STORE.siteUrl.replace("https://", "")}/blogs/blog/{post.handle}
                </p>
                <p className="text-base text-[#1a0dab] dark:text-[#8ab4f8]">{post.seoTitle || `${post.title} | Klaev`}</p>
                <p className="line-clamp-2 text-muted-foreground">{post.seoDescription || post.excerpt || "Add a summary for search engines to show."}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("seoTitle")} className="text-sm font-medium">
                  Page title
                </label>
                <input id={field("seoTitle")} form={FORM} name="seoTitle" defaultValue={post.seoTitle ?? ""} maxLength={70} className={adminField} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("seoDescription")} className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id={field("seoDescription")}
                  form={FORM}
                  name="seoDescription"
                  rows={3}
                  maxLength={320}
                  defaultValue={post.seoDescription ?? ""}
                  className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("handle")} className="text-sm font-medium">
                  Address
                </label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-muted-foreground">/blogs/blog/</span>
                  <input id={field("handle")} form={FORM} name="handle" defaultValue={post.handle} className={adminField} />
                </div>
                <p className="text-xs text-muted-foreground">Changing it after publishing breaks links people already have.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <select id={field("status")} form={FORM} name="status" defaultValue={post.status} aria-label="Status" className={adminField}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("publishedOn")} className="text-sm font-medium">
                  Date
                </label>
                <input
                  id={field("publishedOn")}
                  form={FORM}
                  name="publishedOn"
                  type="date"
                  defaultValue={post.publishedAt ? karachiDay(post.publishedAt) : ""}
                  className={adminField}
                />
                <p className="text-xs text-muted-foreground">Empty is today when it&apos;s published. A later date waits until then.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {post.coverSrc && post.coverWidth && post.coverHeight ? (
                <Image
                  src={post.coverSrc}
                  width={post.coverWidth}
                  height={post.coverHeight}
                  alt={post.coverAlt ?? ""}
                  sizes="320px"
                  className="aspect-4/3 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-4/3 w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">No cover yet</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <PhotoUploader upload={uploadPostCover.bind(null, id)} multiple={false} label={post.coverSrc ? "Replace cover" : "Add a cover"} />
                {post.coverSrc ? (
                  <ActionDialog
                    action={removeCoverAction}
                    label="Remove"
                    title="Remove the cover photo?"
                    hidden={{ postId: id }}
                    submit="Remove it"
                    dismiss="Keep it"
                    variant="ghost"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={field("coverAlt")} className="text-sm font-medium">
                  Description
                </label>
                <input id={field("coverAlt")} form={FORM} name="coverAlt" defaultValue={post.coverAlt ?? ""} placeholder="What the photo shows" className={adminField} />
              </div>
            </CardContent>
          </Card>

          <ActionDialog
            action={deletePostAction}
            label="Delete article"
            title={`Delete "${post.title}"?`}
            description={live ? "It comes off the store, and its address stops working." : "It's gone for good."}
            hidden={{ postId: id }}
            submit="Delete it"
            dismiss="Keep it"
            variant="ghost"
          />
        </div>
      </div>
    </>
  );
}
