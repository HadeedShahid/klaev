import { Download, Plus, Printer, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OrderFilters } from "@/components/admin/order-filters";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { filtersQuery, hasFilters, readOrderFilters } from "@/lib/admin/order-filters";
import { countOrders, listOrders, orderCounts, type OrderFilter } from "@/lib/admin/orders";
import { TONE_DOT, type Tone } from "@/lib/admin/tones";
import { getDb } from "@/lib/db";
import { adminField, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 25;

// The tabs, in the order the work happens. Queues list the longest-waiting order first.
// Each tab's dot is its orders' status colour, so the tabs double as the colours' key.
const TABS: { key: OrderFilter | "all"; label: string; tone?: Tone; queue?: boolean; empty: string }[] = [
  { key: "all", label: "All", empty: "No orders yet. They appear here the moment one is placed." },
  { key: "to_confirm", label: "To confirm", tone: "amber", queue: true, empty: "Nothing to confirm. New orders land here." },
  { key: "to_ship", label: "To ship", tone: "green", queue: true, empty: "Nothing to ship. Confirmed orders wait here for their tracking number." },
  { key: "shipped", label: "Shipped", tone: "blue", queue: true, empty: "Nothing with the courier." },
  { key: "payout_due", label: "Payout due", tone: "blue", queue: true, empty: "No payouts to record. Delivered COD orders wait here until the courier pays out." },
  { key: "delivered", label: "Delivered", tone: "violet", empty: "Nothing delivered yet." },
  { key: "closed", label: "Cancelled", tone: "red", empty: "Nothing cancelled or refused." },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const tab = TABS.find((candidate) => candidate.key === params.tab) ?? TABS[0];
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const filter = tab.key === "all" ? undefined : tab.key;
  const filters = readOrderFilters(params);
  const filtered = hasFilters(filters);

  const db = await getDb();
  const [rows, total, counts] = await Promise.all([
    listOrders(db, { filter, query, ...filters, oldestFirst: tab.queue, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countOrders(db, { filter, query, ...filters }),
    orderCounts(db, filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Links keep the tab, the search and the filters unless told otherwise.
  const href = (next: { tab?: string; page?: number; filters?: boolean; query?: boolean }) => {
    const search = new URLSearchParams();
    const key = next.tab ?? tab.key;
    if (key !== "all") search.set("tab", key);
    if (query && next.query !== false) search.set("q", query);
    if (next.filters !== false) for (const [name, value] of filtersQuery(filters)) search.set(name, value);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const text = search.toString();
    return `/admin/orders${text ? `?${text}` : ""}`;
  };
  const exportQuery = href({}).split("?")[1] ?? "";
  const base = href({ filters: false }).split("?")[1] ?? "";

  return (
    <>
      <PageHeader title="Orders">
        <form role="search" action="/admin/orders" className="relative w-72 max-w-full">
          {tab.key !== "all" ? <input type="hidden" name="tab" value={tab.key} /> : null}
          {[...filtersQuery(filters)].map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={query}
            aria-label="Find an order"
            placeholder="Order number, name or phone"
            className={cn(adminField, "h-9 pl-9")}
          />
        </form>
        <Button variant="outline" size="sm" nativeButton={false} render={<a href={`/admin/export/orders${exportQuery ? `?${exportQuery}` : ""}`} download />}>
          <Download data-icon="inline-start" strokeWidth={1.8} aria-hidden />
          Export
        </Button>
        <Button size="sm" nativeButton={false} render={<Link href="/admin/orders/new" />}>
          <Plus data-icon="inline-start" strokeWidth={1.8} aria-hidden />
          Create order
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav aria-label="Order status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TABS.map((candidate) => {
            const active = candidate.key === tab.key;
            const count = candidate.key === "all" ? counts.all : counts[candidate.key];
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
                {candidate.tone ? <span className={cn("size-1.5 rounded-full", TONE_DOT[candidate.tone])} aria-hidden /> : null}
                {candidate.label}
                <span className={cn("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-background" : "bg-muted")}>{count}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <OrderFilters base={base} values={{ method: filters.method, paid: filters.paid, placed: filters.placed, fromDay: filters.fromDay, toDay: filters.toDay }} />
          {filtered ? (
            <Link href={href({ filters: false })} className="text-sm font-medium underline-offset-4 hover:underline">
              Clear filters
            </Link>
          ) : null}
        </div>

        {tab.key === "to_ship" && counts.to_ship > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
            <p>
              {counts.to_ship} {counts.to_ship === 1 ? "order is" : "orders are"} waiting for the courier.
            </p>
            <a href="/admin/print" target="_blank" rel="noreferrer" className={cn(quietPill, "h-9 bg-background")}>
              <Printer className="size-4" strokeWidth={1.8} aria-hidden />
              Print packing slips
            </a>
          </div>
        ) : null}

        {query ? (
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "No orders" : `${total} ${total === 1 ? "order" : "orders"}`} matching &ldquo;{query}&rdquo;.{" "}
            <Link href={href({ query: false })} className="font-medium text-foreground underline-offset-4 hover:underline">
              Clear search
            </Link>
          </p>
        ) : null}

        <Card className="py-0">
          {rows.length > 0 ? (
            <OrdersTable rows={rows} />
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {query ? "Try a number, a name or a phone number." : filtered ? "No orders match these filters." : tab.empty}
            </p>
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
