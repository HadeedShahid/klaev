import { isAdmin } from "@/lib/admin/auth";
import { REPORT_TABS, reports, tableCsv, type ReportTab } from "@/lib/admin/analytics";
import { getCourierSettings } from "@/lib/admin/courier";
import { periodFrom } from "@/lib/admin/period";
import { todayInKarachi } from "@/lib/admin/format";
import { getDb } from "@/lib/db";

// One report table as a CSV download: /admin/export/report?tab=sales&table=by-product&days=30.
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Sign in first.", { status: 401 });
  const params = new URL(request.url).searchParams;
  const tab = REPORT_TABS.find((candidate) => candidate.key === params.get("tab"))?.key as ReportTab | undefined;
  if (!tab) return new Response("No such report.", { status: 404 });
  const days = periodFrom(params.get("days"));
  const db = await getDb();
  const courier = await getCourierSettings(db);
  const table = (await reports(db, tab, days, { codTaxPercent: courier.codTaxPercent })).find((candidate) => candidate.key === params.get("table"));
  if (!table) return new Response("No such report.", { status: 404 });
  return new Response(tableCsv(table), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="klaev-${tab}-${table.key}-${days}-days-${todayInKarachi()}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
