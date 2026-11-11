import Image from "next/image";
import Link from "next/link";

import type { StoreReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

import { LeatherSwatch } from "./leather-swatch";
import { Stars, VerifiedBadge } from "./stars";

// Where a review's photo and screenshot sit in the row's photo viewer.
export type ViewerSlots = Map<string, number>;

// One buyer's note: their photo when they sent one, the stars and the verified badge, their words,
// and who they are, the leather they bought shown as a swatch. A review typed in from a message can show
// the message, once its screenshot is added; where it was sent isn't said.
// `linked` makes the jacket a link, for reviews of another colour or away from the product page.
export function ReviewCard({
  review,
  slots,
  linked = false,
  order,
  className,
}: {
  review: StoreReview;
  slots: ViewerSlots;
  linked?: boolean;
  // Its place in a row whose columns step aside on phones (review-row.tsx).
  order?: number;
  className?: string;
}) {
  const detail = [review.product.colour, review.size ? `size ${review.size}` : null].filter(Boolean).join(", ");
  const bought = detail ? detail.charAt(0).toUpperCase() + detail.slice(1) : null;
  const photoSlot = review.photo ? slots.get(review.photo.src) : undefined;
  const messageSlot = review.screenshot ? slots.get(review.screenshot.src) : undefined;

  return (
    <article data-testid="review" data-slide style={order === undefined ? undefined : { order }} className={cn("flex flex-col gap-4 rounded-2xl bg-muted p-5", className)}>
      {review.photo && photoSlot !== undefined ? (
        <div className="relative">
          <Image
            src={review.photo.src}
            width={review.photo.width}
            height={review.photo.height}
            alt={`${review.name} wearing it`}
            sizes="(min-width: 768px) 30vw, 80vw"
            className="aspect-square w-full rounded-xl bg-background object-cover object-[50%_25%] md:aspect-4/5"
          />
          <button type="button" data-open-photo={photoSlot} aria-label={`View ${review.name}'s photo larger`} className="absolute inset-0 cursor-zoom-in rounded-xl" />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <Stars rating={review.rating} />
        <VerifiedBadge />
      </div>
      {review.body ? <p className="text-[1.0625rem] leading-relaxed text-pretty whitespace-pre-line">{review.body}</p> : null}
      <div className="flex items-center gap-3">
        {review.product.swatch ? <LeatherSwatch photo={review.product.swatch} /> : null}
        <div className="flex min-w-0 flex-col">
          <p className="text-[0.9375rem] leading-snug font-medium">
            {review.name}
            {review.city ? `, ${review.city}` : ""}
          </p>
          <p className="text-sm leading-snug text-muted-foreground">
            {bought ? (
              linked ? (
                <Link href={`/products/${review.product.handle}`} className="underline-offset-[0.2em] hover:text-foreground hover:underline">
                  {bought}
                </Link>
              ) : (
                bought
              )
            ) : null}
          </p>
        </div>
      </div>
      {messageSlot !== undefined ? (
        <p className="text-sm">
          <button type="button" data-open-photo={messageSlot} className="underline underline-offset-[0.2em] hover:no-underline">
            See the message
          </button>
        </p>
      ) : null}
      {review.reply ? (
        <p className="border-t border-hairline pt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Klaev:</span> {review.reply}
        </p>
      ) : null}
    </article>
  );
}

// The photos and screenshots of a set of reviews, in order, for one photo viewer, and where each sits.
export function viewerPhotos(reviews: StoreReview[]) {
  const images: { src: string; width: number; height: number; alt: string }[] = [];
  const slots: ViewerSlots = new Map();
  for (const review of reviews) {
    if (review.photo) {
      slots.set(review.photo.src, images.length);
      images.push({ ...review.photo, alt: `${review.name} wearing it` });
    }
    if (review.screenshot) {
      slots.set(review.screenshot.src, images.length);
      images.push({ ...review.screenshot, alt: `${review.name}'s message` });
    }
  }
  return { images, slots };
}
