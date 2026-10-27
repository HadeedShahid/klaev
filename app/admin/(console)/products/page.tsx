import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { listProducts, productCounts, PRODUCT_STATUSES, type ProductStatus } from "@/lib/admin/products";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const TABS: { key: ProductStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

const STATUS_BADGE: Record<ProductStatus, "secondary" | "outline" | "default"> = { active: "secondary", draft: "outline", archived: "outline" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const params = await searchParams;
  const status = PRODUCT_STATUSES.find((candidate) => candidate === params.status);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const db = await getDb();
  const [rows, counts] = await Promise.all([listProducts(db, { status, query }), productCounts(db)]);
  const href = (key: string) => {
    const search = new URLSearchParams();
    if (key !== "all") search.set("status", key);
    if (query) search.set("q", query);
    const text = search.toString();
    return `/admin/products${text ? `?${text}` : ""}`;
  };
  const current = status ?? "all";

  return (
    <>
      <PageHeader title="Products">
        <form role="search" action="/admin/products" className="relative w-64 max-w-full">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden />
          <input name="q" type="search" defaultValue={query} aria-label="Find a product" placeholder="Find a product" className={cn(adminField, "h-9 pl-9")} />
        </form>
        <Link href="/admin/products/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" strokeWidth={1.8} aria-hidden />
          Add product
        </Link>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav aria-label="Product status" className="flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={href(tab.key)}
              aria-current={tab.key === current ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                tab.key === current && "bg-muted font-medium text-foreground",
              )}
            >
              {tab.label}
              <span className={cn("rounded-md px-1.5 text-xs tabular-nums", tab.key === current ? "bg-background" : "bg-muted")}>{counts[tab.key]}</span>
            </Link>
          ))}
        </nav>
        <Card className="py-0">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "Nothing matches that." : "No products here."}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Inventory</TableHead>
                  <TableHead className="hidden lg:table-cell">Collection</TableHead>
                  <TableHead className="pr-4 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="relative border-hairline">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="aspect-4/5 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {row.image ? <Image src={row.image} width={80} height={100} alt="" sizes="40px" className="size-full object-cover" /> : null}
                        </div>
                        <Link href={`/admin/products/${row.id}`} className="font-medium after:absolute after:inset-0">
                          {row.title}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[row.status]} className={cn(row.status !== "active" && "text-muted-foreground")}>
                        {row.status === "active" ? "Active" : row.status === "draft" ? "Draft" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("hidden tabular-nums md:table-cell", row.stock === 0 && "text-muted-foreground")}>
                      {row.stock === 0 ? "Sold out" : `${row.stock} in stock`}
                      <span className="text-muted-foreground">{row.sizes > 1 ? ` across ${row.sizes} sizes` : ""}</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{row.collection}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {row.compareAtPrice ? <span className="mr-2 text-muted-foreground line-through">{formatPKR(row.compareAtPrice)}</span> : null}
                      <span className="font-medium">{formatPKR(row.price)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
