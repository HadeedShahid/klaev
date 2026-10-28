import type { Metadata } from "next";
import Link from "next/link";

import { AutoRefresh } from "@/components/admin/auto-refresh";
import { StatusBadge } from "@/components/admin/badges";
import { Kpi } from "@/components/admin/kpi";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { liveView } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { ago } from "@/lib/admin/format";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export const metadata: Metadata = { title: "Live view" };

const DEVICES = { phone: "Phone", tablet: "Tablet", desktop: "Computer" } as Record<string, string>;

// The store right now, refreshed every 10 seconds: who's on it and where, carts and checkouts in
// play, and today's orders as they come in.
export default async function LivePage() {
  await requireAdmin();
  const live = await liveView(await getDb());
  return (
    <>
      <PageHeader title="Live view">
        <p className="text-sm text-muted-foreground">Updates every 10 seconds</p>
      </PageHeader>
      <AutoRefresh seconds={10} />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Visitors right now" value={String(live.visitors)} note="On the store in the last 5 minutes" />
          <Kpi label="Carts open" value={String(live.carts)} note="Added to cart in the last 30 minutes, no order yet" />
          <Kpi label="Checkouts in progress" value={String(live.checkouts)} note="A phone number typed in the last 30 minutes" />
          <Kpi label="Orders today" value={String(live.orders.length)} note={`${formatPKR(live.sales)} so far`} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-hairline py-4">
              <CardTitle>On the store now</CardTitle>
              <CardDescription>Each visit&apos;s latest page</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {live.pages.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Page</TableHead>
                      <TableHead className="hidden sm:table-cell">From</TableHead>
                      <TableHead className="hidden md:table-cell">City</TableHead>
                      <TableHead className="pr-4 text-right">Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {live.pages.map((page) => (
                      <TableRow key={page.sessionId} className="border-hairline">
                        <TableCell className="max-w-72 pl-4">
                          <a href={page.path} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                            {page.path}
                          </a>
                          <span className="text-xs text-muted-foreground">{DEVICES[page.device ?? ""] ?? "Unknown device"}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{page.sourceLabel}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{page.city ?? "Unknown"}</TableCell>
                        <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">{ago(page.at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nobody on the store in the last 5 minutes.</p>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s orders</CardTitle>
              </CardHeader>
              <CardContent>
                {live.orders.length ? (
                  <ul className="-mx-2 flex flex-col">
                    {live.orders.map((order) => (
                      <li key={order.number}>
                        <Link href={`/admin/orders/${order.number}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-medium tabular-nums">
                              #{order.number} <span className="font-normal text-muted-foreground">{order.name}</span>
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {order.city ?? "No city"} · {ago(order.at)}
                            </span>
                          </span>
                          <span className="flex flex-col items-end gap-1">
                            <span className="text-sm tabular-nums">{formatPKR(order.total)}</span>
                            <StatusBadge status={order.status as Parameters<typeof StatusBadge>[0]["status"]} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No orders yet today.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cities now</CardTitle>
              </CardHeader>
              <CardContent>
                {live.cities.length ? (
                  <dl className="flex flex-col divide-y divide-hairline text-sm">
                    {live.cities.map((row) => (
                      <div key={row.city} className="flex justify-between gap-3 py-2">
                        <dt>{row.city}</dt>
                        <dd className="tabular-nums">{row.visitors}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No one with a known city right now.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
