import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/page-header";
import { change, Kpi } from "@/components/admin/kpi";
import { PeriodControl } from "@/components/admin/period-control";
import { TrendChart } from "@/components/admin/trend-chart";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { expectedPayout, getCourierSettings } from "@/lib/admin/courier";
import { dashboardSummary, needsAction, salesByDay } from "@/lib/admin/dashboard";
import { listOrders } from "@/lib/admin/orders";
import { periodFrom } from "@/lib/admin/period";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function ActionRow({ href, count, label, detail }: { href: string; count: number; label: string; detail?: string }) {
  return (
    <li>
      <Link
        href={href}
        className={cn("flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted", count === 0 && "text-muted-foreground")}
      >
        <span className={cn("w-8 text-lg font-semibold tabular-nums", count === 0 && "font-normal")}>{count}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{label}</span>
          {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
        </span>
        <ArrowRight className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden />
      </Link>
    </li>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const days = periodFrom((await searchParams).days);
  const db = await getDb();
  const courier = await getCourierSettings(db);
  const [summary, series, action, recent] = await Promise.all([
    dashboardSummary(db, days, new Date(), courier.codTaxPercent),
    salesByDay(db, days),
    needsAction(db),
    listOrders(db, { limit: 6 }),
  ]);
  const span = `the ${days} days before`;
  const lastPieces = action.lowStock.filter((item) => item.stock === 1);
  const soldOut = action.lowStock.length - lastPieces.length;

  return (
    <>
      <PageHeader title="Dashboard">
        <PeriodControl days={days} href={(period) => `/admin?days=${period}`} />
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Sales"
            value={formatPKR(summary.sales.current)}
            delta={change(summary.sales.current, summary.sales.previous)}
            note={`${formatPKR(summary.sales.previous)} in ${span}`}
          />
          <Kpi
            label="Orders"
            value={String(summary.orders.current)}
            delta={change(summary.orders.current, summary.orders.previous)}
            note={`${formatPKR(summary.averageOrder.current)} average order`}
          />
          <Kpi
            label="Cash with the courier"
            value={formatPKR(summary.cashWithCourier.amount)}
            note={
              summary.cashWithCourier.orders === 0
                ? "Every delivered order is paid out"
                : `${summary.cashWithCourier.orders} ${summary.cashWithCourier.orders === 1 ? "order" : "orders"}, about ${formatPKR(expectedPayout(summary.cashWithCourier.amount, courier.codTaxPercent))} after ${courier.codTaxPercent}% tax`
            }
          />
          <Kpi
            label={summary.profit.missingCost > 0 ? "Profit before jacket cost" : "Profit"}
            value={formatPKR(summary.profit.amount)}
            note={
              summary.profit.orders === 0
                ? "No orders delivered in this period"
                : summary.profit.missingCost > 0
                  ? `Before jacket cost: not set on ${summary.profit.missingCost} of ${summary.profit.orders} delivered ${summary.profit.orders === 1 ? "order" : "orders"}`
                  : `On ${summary.profit.orders} delivered ${summary.profit.orders === 1 ? "order" : "orders"}${summary.profit.estimated ? ", COD tax estimated until paid out" : ""}`
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>Per day, last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart label="Sales" money data={series.map((day) => ({ date: day.date, value: day.sales, detail: `${day.orders} ${day.orders === 1 ? "order" : "orders"}` }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Needs action</CardTitle>
              <CardDescription>
                {action.toConfirm + action.toShip + action.overdue + action.withCourier === 0 ? "All caught up." : "Waiting on you"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="-mx-2 flex flex-col">
                <ActionRow
                  href="/admin/orders?tab=to_confirm"
                  count={action.toConfirm}
                  label="To confirm"
                  detail={action.receiptsWaiting > 0 ? `${action.receiptsWaiting} with a receipt in` : undefined}
                />
                <ActionRow href="/admin/orders?tab=to_ship" count={action.toShip} label="To ship" />
                <ActionRow href="/admin/orders?tab=shipped" count={action.overdue} label="Out for over 5 days" detail="Check with the courier" />
                <ActionRow href="/admin/orders?tab=payout_due" count={action.withCourier} label="Payouts to record" detail="Delivered, cash with the courier" />
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="pb-0">
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
              <CardAction>
                <Link href="/admin/orders" className="text-sm font-medium underline-offset-4 hover:underline">
                  View all
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {recent.length > 0 ? (
                <OrdersTable rows={recent} compact />
              ) : (
                <p className="px-4 pb-4 text-sm text-muted-foreground">No orders yet. They appear here the moment one is placed.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Running low</CardTitle>
              <CardDescription>Sizes on their last piece</CardDescription>
              <CardAction>
                <Link href="/admin/stock" className="text-sm font-medium underline-offset-4 hover:underline">
                  All stock
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {lastPieces.length > 0 ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {lastPieces.slice(0, 8).map((item) => (
                    <li key={`${item.handle}-${item.size}`} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {item.title}
                        {item.size ? <span className="text-muted-foreground">, {item.size}</span> : null}
                      </span>
                      <span className="shrink-0 font-medium">1 left</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No size is down to its last piece.</p>
              )}
              {soldOut > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {soldOut} {soldOut === 1 ? "size is" : "sizes are"} sold out.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
