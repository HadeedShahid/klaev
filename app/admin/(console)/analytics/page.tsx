import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Analytics" };

// A place held for the analytics screens (docs/scope.md, Analytics screens): visitors, the funnel,
// live view and reports. Until then, Home has sales, orders and profit.
export default async function AnalyticsPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Analytics" />
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Coming later</CardTitle>
            <CardDescription>
              Visitors, where they come from, the checkout funnel, live view and reports. For now, sales, orders, profit and cash with the
              courier are on{" "}
              <Link href="/admin" className="font-medium text-foreground underline-offset-4 hover:underline">
                Home
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </>
  );
}
