import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { PeriodControl } from "@/components/admin/period-control";
import { ReportCard } from "@/components/admin/report-table";
import { REPORT_TABS, reports, type ReportTab } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { getCourierSettings } from "@/lib/admin/courier";
import { periodFrom } from "@/lib/admin/period";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

// Sales, customers, behaviour, operations and profit, each table with its own CSV.
export default async function ReportsPage({ searchParams }: PageProps<"/admin/analytics/reports">) {
  await requireAdmin();
  const params = await searchParams;
  const days = periodFrom(params.days);
  const tab = (REPORT_TABS.find((candidate) => candidate.key === params.tab)?.key ?? "sales") as ReportTab;
  const db = await getDb();
  const courier = await getCourierSettings(db);
  const tables = await reports(db, tab, days, { codTaxPercent: courier.codTaxPercent });
  const href = (next: { tab?: ReportTab; days?: number }) => `/admin/analytics/reports?tab=${next.tab ?? tab}&days=${next.days ?? days}`;
  return (
    <>
      <PageHeader title="Reports">{tab === "profit" ? null : <PeriodControl days={days} href={(period) => href({ days: period })} />}</PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav aria-label="Reports" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {REPORT_TABS.map((candidate) => (
            <Link
              key={candidate.key}
              href={href({ tab: candidate.key })}
              aria-current={candidate.key === tab ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                candidate.key === tab && "bg-muted font-medium text-foreground",
              )}
            >
              {candidate.label}
            </Link>
          ))}
        </nav>
        {tab === "profit" ? <p className="text-sm text-muted-foreground">Every month on record, newest first.</p> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {tables.map((table) => (
            <div key={table.key} className={cn(table.columns.length > 5 && "xl:col-span-2")}>
              <ReportCard table={table} csvHref={`/admin/export/report?tab=${tab}&table=${table.key}&days=${days}`} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
