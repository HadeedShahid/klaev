import type { Metadata } from "next";

import { PrintBar } from "@/components/admin/print-bar";
import { PrintDocument } from "@/components/admin/print-document";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminOrder, listOrders, type AdminOrder } from "@/lib/admin/orders";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Packing slips" };

// A packing slip for every order waiting to ship, one per page, oldest first.
export default async function PrintSlipsPage() {
  await requireAdmin();
  const db = await getDb();
  const rows = await listOrders(db, { filter: "to_ship", oldestFirst: true, limit: 100 });
  const orders = (await Promise.all(rows.map((row) => getAdminOrder(db, row.number)))).filter((order): order is AdminOrder => order !== null);
  return (
    <div className="min-h-dvh">
      <PrintBar label={orders.length === 0 ? "Nothing waiting to ship." : `${orders.length} packing ${orders.length === 1 ? "slip" : "slips"}, one per page`} />
      <div className="px-6">
        {orders.map((order) => (
          <PrintDocument key={order.number} order={order} kind="slip" />
        ))}
      </div>
    </div>
  );
}
