import type { Metadata } from "next";

import { change, Kpi } from "@/components/admin/kpi";
import { PageHeader } from "@/components/admin/page-header";
import { PeriodControl } from "@/components/admin/period-control";
import { TrendChart } from "@/components/admin/trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { overview } from "@/lib/admin/analytics";
import { periodFrom } from "@/lib/admin/period";
import { getDb } from "@/lib/db";
import { forgetOldData } from "@/lib/retention";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const plural = (count: number, one: string, many: string) => `${count.toLocaleString("en-PK")} ${count === 1 ? one : many}`;
const DEVICE_LABELS = { phone: "Phones", tablet: "Tablets", desktop: "Computers" } as const;

// A share as a bar in Ink on its Panel Grey track: devices and sources at a glance.
function Share({ value }: { value: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
    </span>
  );
}

// How the store did over the period, against the period before: sales and visits, where they came
// from, and what sold.
export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin();
  const days = periodFrom((await searchParams).days);
  const db = await getDb();
  await forgetOldData(db);
  const data = await overview(db, days);
  const { current, previous } = data;
  const before = `the ${days} days before`;

  return (
    <>
      <PageHeader title="Analytics">
        <PeriodControl days={days} href={(period) => `/admin/analytics?days=${period}`} />
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {current.visitors === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            No visits counted in this period. The store counts visits from the day it runs on its own address; until klaev.com points here, sales come
            from orders alone and visits stay empty.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi label="Sales" value={formatPKR(current.sales)} delta={change(current.sales, previous.sales)} note={`${formatPKR(previous.sales)} in ${before}`} />
          <Kpi label="Orders" value={current.orders.toLocaleString("en-PK")} delta={change(current.orders, previous.orders)} note={`${previous.orders} in ${before}`} />
          <Kpi
            label="Average order"
            value={formatPKR(current.averageOrder)}
            delta={change(current.averageOrder, previous.averageOrder)}
            note={`${formatPKR(previous.averageOrder)} in ${before}`}
          />
          <Kpi
            label="Visitors"
            value={current.visitors.toLocaleString("en-PK")}
            delta={change(current.visitors, previous.visitors)}
            note={`${plural(current.sessions, "visit", "visits")}, ${previous.visitors.toLocaleString("en-PK")} visitors in ${before}`}
          />
          <Kpi
            label="Conversion rate"
            value={`${current.conversion}%`}
            note={current.sessions ? `Visits that ended in an order on the site. ${previous.conversion}% in ${before}.` : "Orders placed on the site, for every visit."}
          />
          <Kpi
            label="Returning customers"
            value={`${current.returningRate}%`}
            note={`Orders from customers who had ordered before. ${previous.returningRate}% in ${before}.`}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>Per day, last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart label="Sales" money data={data.sales.map((day) => ({ date: day.date, value: day.sales, detail: plural(day.orders, "order", "orders") }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Visitors</CardTitle>
              <CardDescription>Per day, last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart label="Visitors" data={data.visitors.map((day) => ({ date: day.date, value: day.visitors, detail: plural(day.sessions, "visit", "visits") }))} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-hairline py-4">
              <CardTitle>Where visits come from</CardTitle>
              <CardDescription>The site or app each visit started from, and the orders those visits placed</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {data.sources.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Source</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Orders</TableHead>
                      <TableHead className="pr-4 text-right">Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sources.map((row) => (
                      <TableRow key={row.source} className="border-hairline">
                        <TableCell className="w-1/3 min-w-24 pl-4">
                          <span className="flex flex-col gap-1.5">
                            <span className="font-medium">{row.label}</span>
                            <Share value={row.share} />
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.sessions.toLocaleString("en-PK")} <span className="text-muted-foreground">({row.share}%)</span>
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{row.orders}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">{formatPKR(row.sales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No visits in this period yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-hairline py-4">
              <CardTitle>Top products</CardTitle>
              <CardDescription>By sales, from orders that weren&apos;t cancelled or refused</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {data.products.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Product</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Units</TableHead>
                      <TableHead className="pr-4 text-right">Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.products.map((row) => (
                      <TableRow key={row.title} className="border-hairline">
                        <TableCell className="pl-4 font-medium whitespace-normal sm:max-w-64 sm:truncate sm:whitespace-nowrap">{row.title}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{row.units}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">{formatPKR(row.sales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No sales in this period yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-hairline py-4">
              <CardTitle>By city</CardTitle>
              <CardDescription>Visitors from the connection&apos;s city; orders from the delivery address</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {data.cities.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">City</TableHead>
                      <TableHead className="text-right">Visitors</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Orders</TableHead>
                      <TableHead className="pr-4 text-right">Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cities.map((row) => (
                      <TableRow key={row.city.toLowerCase()} className="border-hairline">
                        <TableCell className="pl-4 font-medium capitalize">{row.city}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", row.visitors === 0 && "text-muted-foreground")}>{row.visitors}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{row.orders}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">{formatPKR(row.sales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing in this period yet.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Devices</CardTitle>
                <CardDescription>What visits came on</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  {data.devices.map((row) => (
                    <div key={row.device} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <dt>{DEVICE_LABELS[row.device]}</dt>
                        <dd className="tabular-nums">
                          {row.share}% <span className="text-muted-foreground">({row.sessions.toLocaleString("en-PK")})</span>
                        </dd>
                      </div>
                      <Share value={row.share} />
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>Links tagged with utm_campaign</CardDescription>
              </CardHeader>
              <CardContent>
                {data.campaigns.length ? (
                  <dl className="flex flex-col divide-y divide-hairline text-sm">
                    {data.campaigns.map((row) => (
                      <div key={row.campaign} className="flex items-baseline justify-between gap-3 py-2">
                        <dt className="truncate font-medium">{row.campaign}</dt>
                        <dd className="text-muted-foreground tabular-nums">
                          {plural(row.sessions, "visit", "visits")}, {plural(row.orders, "order", "orders")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">None yet. Add ?utm_campaign=eid to a link in a post or an ad to see it here.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
