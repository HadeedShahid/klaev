import type { Metadata } from "next";
import Link from "next/link";

import { collectionAction } from "@/app/actions/admin-products";
import { ActionDialog } from "@/components/admin/action-dialog";
import { CollectionMove } from "@/components/admin/collection-move";
import { Field } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { listCollectionsWithCounts } from "@/lib/admin/collections";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Collections" };

// The store's collections in the order its menu and home page show them. Products join one from
// their own page.
export default async function CollectionsPage() {
  await requireAdmin();
  const rows = await listCollectionsWithCounts(await getDb());
  return (
    <>
      <PageHeader title="Collections">
        <ActionDialog action={collectionAction} label="Add collection" title="Add a collection" hidden={{ intent: "create" }} submit="Add collection" variant="default">
          <Field id="new-collection-title" name="title" label="Name" placeholder="Winter coats" required autoComplete="off" autoFocus />
        </ActionDialog>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Each product belongs to one collection, chosen on its page. Renaming keeps the collection&apos;s address, so links keep working.
        </p>
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Collection</TableHead>
                <TableHead className="hidden sm:table-cell">Address</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.handle} className="border-hairline">
                  <TableCell className="pl-4 font-medium">{row.title}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    <Link href={`/collections/${row.handle}`} target="_blank" className="underline-offset-4 hover:underline">
                      /collections/{row.handle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.products}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <CollectionMove handle={row.handle} first={index === 0} last={index === rows.length - 1} />
                      <ActionDialog action={collectionAction} label="Rename" title={`Rename ${row.title}`} hidden={{ intent: "rename", handle: row.handle }} submit="Save" variant="ghost">
                        <Field id={`collection-${row.handle}-title`} name="title" label="Name" defaultValue={row.title} required autoComplete="off" />
                      </ActionDialog>
                      {row.products === 0 ? (
                        <ActionDialog
                          action={collectionAction}
                          label="Remove"
                          title={`Remove ${row.title}?`}
                          description="It's empty, so nothing on the store changes except its page."
                          hidden={{ intent: "delete", handle: row.handle }}
                          submit="Remove it"
                          dismiss="Keep it"
                          variant="ghost"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
