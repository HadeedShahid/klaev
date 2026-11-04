import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoxLabel } from "@/components/admin/box-label";
import { PrintBar } from "@/components/admin/print-bar";
import { PrintDocument } from "@/components/admin/print-document";
import { requireAdmin } from "@/lib/admin/auth";
import { exchangeLinks } from "@/lib/admin/order-changes";
import { getAdminOrder } from "@/lib/admin/orders";
import { getDb } from "@/lib/db";

const DOCUMENTS = { slip: "Packing slip", invoice: "Invoice", label: "Box label" } as const;
type Doc = keyof typeof DOCUMENTS;

// The packing slip unless the link asks for another.
const docFrom = (doc: string | string[] | undefined): Doc => (doc === "invoice" || doc === "label" ? doc : "slip");

export async function generateMetadata({ params, searchParams }: PageProps<"/admin/print/[number]">): Promise<Metadata> {
  return { title: `${DOCUMENTS[docFrom((await searchParams).doc)]} #${(await params).number}` };
}

// One order's packing slip, invoice or box label, ready to print.
export default async function PrintOrderPage({ params, searchParams }: PageProps<"/admin/print/[number]">) {
  await requireAdmin();
  const db = await getDb();
  const order = await getAdminOrder(db, Number((await params).number));
  if (!order) notFound();
  const doc = docFrom((await searchParams).doc);
  const { replaces } = doc === "label" ? { replaces: null } : await exchangeLinks(db, order);
  return (
    <div className="min-h-dvh">
      <PrintBar label={`${DOCUMENTS[doc]} for #${order.number}`} />
      <div className="px-6">
        {doc === "label" ? <BoxLabel order={order} /> : <PrintDocument order={order} kind={doc} exchangeFor={replaces} />}
      </div>
    </div>
  );
}
