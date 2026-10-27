import { Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { correctStock, restockSize } from "@/app/actions/admin";
import { ActionDialog } from "@/components/admin/action-dialog";
import { Field } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { INVENTORY_FILTERS, inventoryCounts, listInventory, type InventoryFilter } from "@/lib/admin/stock";
import { getDb } from "@/lib/db";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory" };

const TABS: Record<InventoryFilter, string> = { all: "All", low: "Last piece", out: "Sold out" };

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  await requireAdmin();
  const params = await searchParams;
  const filter = INVENTORY_FILTERS.find((candidate) => candidate === params.filter) ?? "all";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const db = await getDb();
  const [rows, counts] = await Promise.all([listInventory(db, { filter, query }), inventoryCounts(db)]);
  const href = (next: InventoryFilter) => {
    const search = new URLSearchParams();
    if (next !== "all") search.set("filter", next);
    if (query) search.set("q", query);
    const text = search.toString();
    return `/admin/inventory${text ? `?${text}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Inventory">
        <form role="search" action="/admin/inventory" className="relative w-72 max-w-full">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden />
          <input name="q" type="search" defaultValue={query} aria-label="Find a product" placeholder="Product or SKU" className={cn(adminField, "h-9 pl-9")} />
        </form>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Pieces free to sell, per size. <span className="font-medium text-foreground">Restock</span> adds what came in;{" "}
          <span className="font-medium text-foreground">Correct</span> sets the count on the shelf. Orders take their pieces when they&apos;re
          placed, cancelled and refused orders put them back, and every change is kept in the product&apos;s history.
        </p>
        <nav aria-label="Stock" className="flex gap-1">
          {INVENTORY_FILTERS.map((key) => (
            <Link
              key={key}
              href={href(key)}
              aria-current={key === filter ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                key === filter && "bg-muted font-medium text-foreground",
              )}
            >
              {TABS[key]}
              <span className={cn("rounded-md px-1.5 text-xs tabular-nums", key === filter ? "bg-background" : "bg-muted")}>{counts[key]}</span>
            </Link>
          ))}
        </nav>
        <Card className="py-0">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {query ? "Nothing matches that." : filter === "out" ? "Nothing is sold out." : filter === "low" ? "No size is on its last piece." : "No products yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const name = `${row.title}${row.size ? `, size ${row.size}` : ""}`;
                  return (
                    <TableRow key={row.variantId} className="border-hairline">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="aspect-4/5 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                            {row.image ? <Image src={row.image} width={72} height={90} alt="" sizes="36px" className="size-full object-cover" /> : null}
                          </div>
                          <Link href={`/admin/products/${row.productId}`} className="font-medium hover:underline">
                            {row.title}
                          </Link>
                          {row.status === "draft" ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Draft
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{row.size ?? "One size"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{row.sku}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", row.stock === 0 ? "text-muted-foreground" : "font-medium")}>
                        {row.stock === 0 ? "Sold out" : row.stock}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-1">
                          <ActionDialog
                            action={restockSize}
                            label="Restock"
                            title={`Restock ${name}`}
                            description={`${row.stock} available now. Enter how many came in; they're added to it.`}
                            hidden={{ variantId: row.variantId }}
                            submit="Restock"
                          >
                            <Field id={`restock-${row.variantId}-quantity`} name="quantity" label="How many came in" inputMode="numeric" required autoFocus />
                            <Field id={`restock-${row.variantId}-note`} name="note" label="Note" placeholder="Optional, e.g. the workshop batch" autoComplete="off" />
                          </ActionDialog>
                          <ActionDialog
                            action={correctStock}
                            label="Correct"
                            title={`Correct the count of ${name}`}
                            description="The number on the shelf right now, if it's different from what the store thinks."
                            hidden={{ variantId: row.variantId, shown: row.stock }}
                            submit="Save count"
                            variant="ghost"
                          >
                            <Field id={`correct-${row.variantId}-count`} name="count" label="Count on the shelf" inputMode="numeric" defaultValue={row.stock} required autoFocus />
                          </ActionDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
