import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ReviewActions } from "@/components/admin/review-actions";
import { Stars } from "@/components/product/stars";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { ago } from "@/lib/admin/format";
import { getDb } from "@/lib/db";
import { listReviews, reviewCounts, type AdminReview, type ReviewStatus } from "@/lib/reviews";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const TABS: { key: string; status: ReviewStatus; label: string; empty: string }[] = [
  { key: "waiting", status: "pending", label: "To approve", empty: "Nothing to approve" },
  { key: "live", status: "published", label: "Live", empty: "No live reviews yet" },
  { key: "hidden", status: "hidden", label: "Hidden", empty: "Nothing hidden" },
];

const SOURCE_LABELS = { site: "Review link", whatsapp: "WhatsApp", instagram: "Instagram" } as const;

// Reviews written through delivered orders' links wait here to be published; ones typed in from
// WhatsApp or Instagram go live at once. Publishing, hiding or picking one changes the store.
export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const asked = (await searchParams).tab;
  const tab = TABS.find((candidate) => candidate.key === asked) ?? TABS[0];
  const db = await getDb();
  const [rows, counts] = await Promise.all([listReviews(db, tab.status), reviewCounts(db)]);
  return (
    <>
      <PageHeader title="Reviews">
        <Link href="/admin/reviews/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Add a review
        </Link>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav aria-label="Reviews" className="flex gap-1">
          {TABS.map((candidate) => {
            const active = candidate === tab;
            return (
              <Link
                key={candidate.key}
                href={candidate === TABS[0] ? "/admin/reviews" : `/admin/reviews?tab=${candidate.key}`}
                aria-current={active ? "page" : undefined}
                className={cn("rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-muted font-medium text-foreground")}
              >
                {candidate.label} <span className="tabular-nums">{counts[candidate.status]}</span>
              </Link>
            );
          })}
        </nav>
        {rows.length === 0 ? (
          <Card className="items-start gap-2 px-6 py-8">
            <p className="font-medium">{tab.empty}</p>
            <p className="text-sm text-muted-foreground">
              Buyers write reviews through the link on a delivered order. One sent on WhatsApp or Instagram can be added by hand.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((review) => (
              <li key={review.id} id={`review-${review.id}`} className="scroll-mt-4">
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ReviewCard({ review }: { review: AdminReview }) {
  const about = [`${review.name}${review.city ? `, ${review.city}` : ""}`, review.size ? `Size ${review.size}` : null];
  return (
    <Card className="gap-3 px-4 py-4 md:px-6" data-testid={`review-${review.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={review.rating} />
          <span className="font-medium">{review.productTitle}</span>
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">{ago(review.createdAt)}</p>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{about.filter(Boolean).join(" · ")}</span>
        {review.orderNumber ? (
          <Link href={`/admin/orders/${review.orderNumber}`} className="tabular-nums underline-offset-4 hover:text-foreground hover:underline">
            #{review.orderNumber}
          </Link>
        ) : null}
        <Badge variant="outline">{SOURCE_LABELS[review.source]}</Badge>
        {review.featured ? <Badge variant="outline">On the home page</Badge> : null}
      </p>
      {review.body ? <p className="max-w-[70ch] text-[0.9375rem] leading-relaxed whitespace-pre-line">{review.body}</p> : null}
      {review.photo || review.screenshot ? (
        <div className="flex gap-3">
          {[
            { image: review.photo, label: "Their photo" },
            { image: review.screenshot, label: "The message" },
          ].map(({ image, label }) =>
            image ? (
              <a key={label} href={image.src} target="_blank" rel="noreferrer" className="flex flex-col gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Image src={image.src} width={image.width} height={image.height} alt={label} sizes="96px" className="size-24 rounded-lg bg-muted object-cover" />
                {label}
              </a>
            ) : null,
          )}
        </div>
      ) : null}
      {review.reply ? (
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Your reply:</span> {review.reply}
        </p>
      ) : null}
      <div className="pt-1">
        <ReviewActions
          review={{
            id: review.id,
            name: review.name,
            status: review.status,
            featured: review.featured,
            reply: review.reply,
            source: review.source,
            hasPhoto: review.photo !== null,
            hasScreenshot: review.screenshot !== null,
          }}
        />
      </div>
    </Card>
  );
}
