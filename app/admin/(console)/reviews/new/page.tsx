import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AddReviewForm } from "@/components/admin/add-review-form";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { shownName } from "@/lib/review-rules";
import { reviewableOrderByNumber } from "@/lib/reviews";
import { adminField } from "@/lib/styles";

export const metadata: Metadata = { title: "Add a review" };

// A review sent on WhatsApp or Instagram, typed in against its order: the order number first, then
// what they said.
export default async function NewReviewPage({ searchParams }: PageProps<"/admin/reviews/new">) {
  await requireAdmin();
  const asked = Number((await searchParams).order);
  const order = asked ? await reviewableOrderByNumber(await getDb(), asked) : null;
  const waiting = order?.items.filter((item) => item.reviewId === null) ?? [];

  let problem: ReactNode = null;
  if (asked && !order) problem = `There's no order #${asked}.`;
  else if (order?.replaces)
    problem = (
      <>
        #{order.number} is a size exchange for #{order.replaces}, so the review goes on #{order.replaces}, in the size they kept.{" "}
        <Link href={`/admin/reviews/new?order=${order.replaces}`} className="font-medium text-foreground underline underline-offset-[0.2em] hover:no-underline">
          Open #{order.replaces}
        </Link>
      </>
    );
  else if (order && !order.open) problem = `Order #${order.number} isn't delivered yet. Mark it delivered, then add the review.`;
  else if (order && waiting.length === 0) problem = `Everything in #${order.number} has a review already.`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/admin/reviews" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Reviews
            </Link>
            <span>Add a review</span>
          </span>
        }
      />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card className="max-w-2xl gap-3 px-4 py-4 md:px-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="review-order" className="text-sm font-medium">
                Order number
              </label>
              <input id="review-order" name="order" inputMode="numeric" defaultValue={asked || ""} required className={`${adminField} w-36 tabular-nums`} />
            </div>
            <Button type="submit" variant="outline">
              Find the order
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">Reviews belong to a delivered order, so every one on the store comes from a real buyer.</p>
          {problem ? (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
        </Card>
        {order && !problem ? (
          <AddReviewForm
            key={order.number}
            number={order.number}
            items={waiting.map(({ lineId, title, size }) => ({ lineId, title, size }))}
            name={shownName(order.name)}
            city={order.city}
          />
        ) : null}
      </div>
    </>
  );
}
