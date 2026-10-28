import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { listPages } from "@/lib/pages";

export const metadata: Metadata = { title: "Pages" };

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });
const path = (page: { kind: string; handle: string }) => `/${page.kind === "policy" ? "policies" : "pages"}/${page.handle}`;

// The store's own pages and policies, at Shopify's addresses. The contact form and the size chart
// are built from the store itself, so they aren't here.
export default async function PagesPage() {
  await requireAdmin();
  const rows = await listPages(await getDb());
  return (
    <>
      <PageHeader title="Pages" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          About, delivery, exchanges and the legal pages, linked from the store&apos;s footer. Each starts from text written for this store; edit any, or put it
          back as it was.
        </p>
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Page</TableHead>
                <TableHead className="hidden sm:table-cell">Address</TableHead>
                <TableHead className="pr-4 text-right">Text</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((page) => (
                <TableRow key={page.handle} className="relative border-hairline">
                  <TableCell className="py-3 pl-4">
                    <Link href={`/admin/content/pages/${page.handle}`} className="font-medium after:absolute after:inset-0">
                      {page.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{path(page)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    {page.edited && page.updatedAt ? (
                      <span className="text-sm text-muted-foreground tabular-nums">Edited {day.format(page.updatedAt)}</span>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Original
                      </Badge>
                    )}
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
