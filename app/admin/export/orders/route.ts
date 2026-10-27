import { isAdmin } from "@/lib/admin/auth";
import { ordersCsv } from "@/lib/admin/export";
import { ORDER_FILTERS, type OrderFilter } from "@/lib/admin/orders";
import { todayInKarachi } from "@/lib/admin/format";
import { getDb } from "@/lib/db";

// The orders list as a CSV download, for the tab and search it was opened from.
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Sign in first.", { status: 401 });
  const params = new URL(request.url).searchParams;
  const tab = params.get("tab") ?? "";
  const filter = tab === "payout_due" || tab in ORDER_FILTERS ? (tab as OrderFilter) : undefined;
  const csv = await ordersCsv(await getDb(), { filter, query: params.get("q") ?? "" });
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="klaev-orders-${todayInKarachi()}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
