import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { PeriodControl } from "@/components/admin/period-control";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { funnel } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { periodFrom } from "@/lib/admin/period";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Funnel" };

// From a visit to a delivered order: how many visits reach each step, and how many drop off on the
// way. Counted in visits until the order, then in those visits' orders.
export default async function FunnelPage({ searchParams }: PageProps<"/admin/analytics/funnel">) {
  await requireAdmin();
  const days = periodFrom((await searchParams).days);
  const steps = await funnel(await getDb(), days);
  return (
    <>
      <PageHeader title="Funnel">
        <PeriodControl days={days} href={(period) => `/admin/analytics/funnel?days=${period}`} />
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>From visit to delivery</CardTitle>
            <CardDescription>
              Last {days} days. For cash on delivery the last two steps matter most: an order isn&apos;t a sale until it&apos;s confirmed and delivered. Orders
              entered by hand aren&apos;t here, only those placed on the site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <li key={step.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[14rem_minmax(0,1fr)_9rem]">
                  <span className="text-sm font-medium">{step.label}</span>
                  <span className="order-last col-span-2 block h-2.5 overflow-hidden rounded-full bg-muted sm:order-none sm:col-span-1" aria-hidden>
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(step.ofVisits, step.count ? 1 : 0)}%` }} />
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    <span className="font-semibold">{step.count.toLocaleString("en-PK")}</span>
                    {index > 0 ? <span className="block text-xs whitespace-nowrap text-muted-foreground">{step.ofPrevious}% of previous</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
