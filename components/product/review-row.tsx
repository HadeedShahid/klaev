import { balanceColumns } from "@/lib/review-rules";
import type { StoreReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

import { ReviewCard, type ViewerSlots } from "./review-card";

const COLUMNS = 3;

// Review cards swiped sideways on a phone, and in three columns of even height from 768px. The cards
// sit in their columns in the page; on a phone the columns step aside (display: contents) and each
// card takes its place in the row by `order`, so the swipe keeps the reviews' own order.
export function ReviewRow({
  id,
  reviews,
  slots,
  linked,
  cardClassName,
}: {
  id: string;
  reviews: StoreReview[];
  slots: ViewerSlots;
  linked: (review: StoreReview) => boolean;
  cardClassName?: string;
}) {
  const columns = balanceColumns(reviews, COLUMNS);
  return (
    <div
      id={id}
      className="scrollbar-none flex w-full snap-x snap-mandatory scroll-px-5 items-start gap-3 overflow-x-auto px-5 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0"
    >
      {Array.from({ length: COLUMNS }, (_, column) => (
        <div key={column} className="contents md:flex md:flex-col md:gap-4">
          {reviews.map((review, index) =>
            columns[index] === column ? (
              <ReviewCard
                key={review.id}
                review={review}
                slots={slots}
                linked={linked(review)}
                order={index}
                className={cn("w-[85%] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none", cardClassName)}
              />
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}
