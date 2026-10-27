import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { NewProductForm } from "@/components/admin/new-product-form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { listCollections } from "@/lib/admin/products";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  const collections = await listCollections(await getDb());
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/admin/products" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Products
            </Link>
            Add product
          </span>
        }
      />
      <div className="p-4 md:p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>New product</CardTitle>
            <CardDescription>It starts as a draft. Add its photos, description and stock on the next page, then put it on the store.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewProductForm collections={collections} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
