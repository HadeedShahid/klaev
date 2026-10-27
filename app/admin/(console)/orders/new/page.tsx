import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ManualOrderForm } from "@/components/admin/manual-order-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin/auth";
import { listSellable } from "@/lib/admin/order-changes";
import { getDb } from "@/lib/db";
import { getCodTerms } from "@/lib/settings";

export const metadata: Metadata = { title: "Create order" };

// A sale made on WhatsApp, Instagram or in person, entered by hand.
export default async function NewOrderPage() {
  await requireAdmin();
  const db = await getDb();
  const [catalog, terms] = await Promise.all([listSellable(db), getCodTerms(db)]);
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/admin/orders" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Orders
            </Link>
            <span>Create order</span>
          </span>
        }
      />
      <div className="p-4 md:p-6">
        <ManualOrderForm catalog={catalog} codDeliveryFee={terms.codDeliveryFee} codAdvance={terms.codAdvance} />
      </div>
    </>
  );
}
