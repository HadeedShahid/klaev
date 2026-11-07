import { formatRating } from "@/lib/review-rules";
import type { ProductReviews } from "@/lib/reviews";

import { AllReviews } from "./all-reviews";
import { GalleryIndicator } from "./gallery-indicator";
import { GalleryViewer } from "./gallery-viewer";
import { ReviewCard, viewerPhotos } from "./review-card";
import { ReviewRow } from "./review-row";
import { Stars } from "./stars";

// The most the page shows; the rest are a tap away in a sheet, so the page never grows with them.
const SHOWN = 6;

// The product page's reviews, under the details: the rating, then the buyers' notes, swiped sideways
// on a phone like the photos above and in even columns on wider screens. Nothing shows until there's one.
export function ReviewsSection({ handle, reviews }: { handle: string; reviews: ProductReviews }) {
  const { summary } = reviews;
  if (!summary) return null;
  const rowId = `reviews-${handle}`;
  const shown = reviews.reviews.slice(0, SHOWN);
  const row = viewerPhotos(shown);
  const all = viewerPhotos(reviews.reviews);
  const linked = (review: (typeof shown)[number]) => review.product.handle !== handle;

  return (
    <section id="reviews" aria-labelledby={`${rowId}-title`} className="mx-auto max-w-6xl scroll-mt-20 pt-16 md:px-8 md:pt-20">
      <div className="flex flex-col gap-2 px-5 md:px-0">
        <h2 id={`${rowId}-title`} className="text-xl font-semibold tracking-tight">
          In their words
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Stars rating={summary.average} />
          <span>
            <span className="font-medium tabular-nums">{formatRating(summary.average)}</span>{" "}
            <span className="text-muted-foreground">
              from {summary.count === 1 ? "1 verified buyer" : `${summary.count} verified buyers`}
              {reviews.allColours ? ", all colours" : ""}
            </span>
          </span>
        </p>
      </div>
      <div className="mt-6">
        <ReviewRow id={rowId} reviews={shown} slots={row.slots} linked={linked} cardClassName={shown.length === 1 ? "w-full max-w-none" : undefined} />
      </div>
      {shown.length > 1 ? <GalleryIndicator targetId={rowId} total={shown.length} className="mx-5 mt-4 flex gap-0.5 md:hidden" /> : null}
      {row.images.length ? <GalleryViewer targetId={rowId} title="what buyers sent" images={row.images} /> : null}
      {reviews.reviews.length > SHOWN ? (
        <div className="mt-6 flex justify-center px-5 md:px-0">
          <AllReviews count={reviews.reviews.length}>
            <div id={`${rowId}-all`} className="flex flex-col gap-3">
              {reviews.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} slots={all.slots} linked={linked(review)} />
              ))}
            </div>
            {all.images.length ? <GalleryViewer targetId={`${rowId}-all`} title="what buyers sent" images={all.images} /> : null}
          </AllReviews>
        </div>
      ) : null}
    </section>
  );
}
