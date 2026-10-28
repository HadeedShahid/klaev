import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { restorePageAction, savePageAction } from "@/app/actions/admin-content";
import { ActionDialog } from "@/components/admin/action-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { SaveForm } from "@/components/admin/save-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { getPage } from "@/lib/pages";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/admin/content/pages/[handle]">): Promise<Metadata> {
  const page = await getPage((await params).handle, await getDb());
  return { title: page?.title ?? "Page" };
}

const FORM = "page-form";

// One page's words, written the way journal articles are, and how search engines describe it.
export default async function EditPagePage({ params }: PageProps<"/admin/content/pages/[handle]">) {
  await requireAdmin();
  const page = await getPage((await params).handle, await getDb());
  if (!page) notFound();
  const path = `/${page.kind === "policy" ? "policies" : "pages"}/${page.handle}`;
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/admin/content/pages" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Pages
            </Link>
            <span className="max-w-[40vw] truncate">{page.title}</span>
          </span>
        }
      >
        <a href={path} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          View on the store
        </a>
        <SaveForm id={FORM} action={savePageAction} hidden={{ handle: page.handle }} />
      </PageHeader>
      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="page-title" className="text-sm font-medium">
                Title
              </label>
              <input id="page-title" form={FORM} name="title" defaultValue={page.title} required className={adminField} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="page-body" className="text-sm font-medium">
                Page
              </label>
              <textarea
                id="page-body"
                form={FORM}
                name="body"
                rows={24}
                defaultValue={page.body}
                className={cn(adminField, "h-auto resize-y py-2 text-[0.9375rem] leading-relaxed")}
              />
              <p className="text-xs text-muted-foreground">
                A blank line starts a new paragraph. Start a line with ## for a heading, or with - for a list. [Words](/pages/contact) makes a link.{" "}
                {"{advance}"}, {"{cod_fee}"}, {"{exchange_days}"}, {"{delivery_days}"}, {"{whatsapp}"} and {"{email}"} show the current terms and contact
                details.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Search engine listing</CardTitle>
              <CardDescription>{path}</CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="page-description" className="sr-only">
                Description
              </label>
              <textarea
                id="page-description"
                form={FORM}
                name="description"
                rows={4}
                maxLength={320}
                defaultValue={page.description}
                className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
              />
            </CardContent>
          </Card>
          {page.edited ? (
            <ActionDialog
              action={restorePageAction}
              label="Put back the original"
              title="Put back the original text?"
              description="Your edits to this page go, and it shows the text it started with."
              hidden={{ handle: page.handle }}
              submit="Put it back"
              dismiss="Keep my edits"
              variant="ghost"
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
