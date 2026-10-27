import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CustomerBadges } from "@/components/admin/customer-badges";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { countCustomers, customerCounts, LAPSED_DAYS, listCustomers, type CustomerSegment } from "@/lib/admin/customers";
import { localPhone } from "@/lib/admin/format";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { adminField, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

const TABS: { key: CustomerSegment | "all"; label: string; empty: string }[] = [
  { key: "all", label: "All", empty: "No customers yet. Everyone who orders appears here." },
  { key: "first_time", label: "First-time", empty: "No first-time customers." },
  { key: "repeat", label: "Repeat", empty: "No repeat customers yet." },
  { key: "lapsed", label: "Lapsed", empty: `Nobody has gone ${LAPSED_DAYS} days without ordering.` },
  { key: "refused", label: "Refused a delivery", empty: "Nobody has refused a delivery." },
];

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });

// Everyone who has bought, the most recent buyers first, with Shopify's segments as tabs.
export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const tab = TABS.find((candidate) => candidate.key === params.tab) ?? TABS[0];
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const segment = tab.key === "all" ? undefined : tab.key;

  const db = await getDb();
  const [rows, total, counts] = await Promise.all([
    listCustomers(db, { segment, query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countCustomers(db, { segment, query }),
    customerCounts(db),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (next: { tab?: string; page?: number }) => {
    const search = new URLSearchParams();
    const key = next.tab ?? tab.key;
    if (key !== "all") search.set("tab", key);
    if (query) search.set("q", query);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const text = search.toString();
    return `/admin/customers${text ? `?${text}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Customers">
        <form role="search" action="/admin/customers" className="relative w-72 max-w-full">
          {tab.key !== "all" ? <input type="hidden" name="tab" value={tab.key} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden />
          <input name="q" type="search" defaultValue={query} aria-label="Find a customer" placeholder="Name, phone or email" className={cn(adminField, "h-9 pl-9")} />
        </form>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav aria-label="Customer segments" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TABS.map((candidate) => {
            const active = candidate.key === tab.key;
            return (
              <Link
                key={candidate.key}
                href={href({ tab: candidate.key })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                {candidate.label}
                <span className={cn("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-background" : "bg-muted")}>{counts[candidate.key]}</span>
              </Link>
            );
          })}
        </nav>

        {query ? (
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "No customers" : `${total} ${total === 1 ? "customer" : "customers"}`} matching &ldquo;{query}&rdquo;.{" "}
            <Link href={href({ tab: tab.key })} className="font-medium text-foreground underline-offset-4 hover:underline">
              Clear search
            </Link>
          </p>
        ) : null}

        <Card className="py-0">
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden sm:table-cell">Segment</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Spent</TableHead>
                  <TableHead className="hidden pr-4 text-right lg:table-cell">Last order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="relative border-hairline">
                    <TableCell className="max-w-56 py-3 pl-4">
                      <Link href={`/admin/customers/${row.id}`} className="block truncate font-medium after:absolute after:inset-0">
                        {row.name || "No name"}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground tabular-nums">{row.phone ? localPhone(row.phone) : (row.email ?? "No contact")}</p>
                      <div className="mt-1.5 sm:hidden">
                        <CustomerBadges stats={row} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{row.city}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <CustomerBadges stats={row} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatPKR(row.spent)}</TableCell>
                    <TableCell className="hidden pr-4 text-right text-muted-foreground tabular-nums lg:table-cell">{row.lastOrderAt ? day.format(row.lastOrderAt) : "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{query ? "Try a name, a phone number or an email." : tab.empty}</p>
          )}
        </Card>

        {pages > 1 ? (
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground tabular-nums">
              {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={href({ page: page - 1 })} className={cn(quietPill, "h-9")}>
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={href({ page: page + 1 })} className={cn(quietPill, "h-9")}>
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
