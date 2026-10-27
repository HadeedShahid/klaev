import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintBar } from "@/components/admin/print-bar";
import { PrintDocument } from "@/components/admin/print-document";
import { requireAdmin } from "@/lib/admin/auth";
import { exchangeLinks } from "@/lib/admin/order-changes";
import { getAdminOrder } from "@/lib/admin/orders";
import { getDb } from "@/lib/db";

export async function generateMetadata({ params, searchParams }: PageProps<"/admin/print/[number]">): Promise<Metadata> {
  const kind = (await searchParams).doc === "invoice" ? "Invoice" : "Packing slip";
  return { title: `${kind} #${(await params).number}` };
}

// One order's packing slip or invoice, ready to print.
export default async function PrintOrderPage({ params, searchParams }: PageProps<"/admin/print/[number]">) {
  await requireAdmin();
  const db = await getDb();
  const order = await getAdminOrder(db, Number((await params).number));
  if (!order) notFound();
  const { replaces } = await exchangeLinks(db, order);
  const kind = (await searchParams).doc === "invoice" ? "invoice" : "slip";
  return (
    <div className="min-h-dvh">
      <PrintBar label={`${kind === "invoice" ? "Invoice" : "Packing slip"} for #${order.number}`} />
      <div className="px-6">
        <PrintDocument order={order} kind={kind} exchangeFor={replaces} />
      </div>
    </div>
  );
}
