import type { Metadata } from "next";

import { FaqEditor } from "@/components/admin/faq-editor";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { getFaq } from "@/lib/faq";

export const metadata: Metadata = { title: "FAQ" };

// The questions at the foot of the home page.
export default async function FaqPage() {
  await requireAdmin();
  const items = await getFaq(await getDb());
  return (
    <>
      <PageHeader title="FAQ" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Home page questions</CardTitle>
            <CardDescription>
              In the order they show. Write {"{advance}"}, {"{cod_fee}"} or {"{exchange_days}"} to show the current amounts from Settings, so the answers
              never disagree with checkout. Plain words: no dashes, prices in PKR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FaqEditor items={items} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
