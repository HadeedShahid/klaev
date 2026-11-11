import Link from "next/link";

import { GalleryIndicator } from "@/components/product/gallery-indicator";
import { GalleryViewer } from "@/components/product/gallery-viewer";
import { LeatherSwatch } from "@/components/product/leather-swatch";
import { viewerPhotos } from "@/components/product/review-card";
import { ReviewRow } from "@/components/product/review-row";
import { Stars, VerifiedBadge } from "@/components/product/stars";
import type { getHomeReviews } from "@/lib/reviews";

// A chapter of the home page's story, between the leather and the sizing: one buyer's words set like
// a headline, then the others to swipe through. It appears once three reviews have words.
export function ReviewsChapter({ reviews }: { reviews: NonNullable<Awaited<ReturnType<typeof getHomeReviews>>> }) {
  const { lead, rest } = reviews;
  const { images, slots } = viewerPhotos([lead, ...rest]);
  const bought = [lead.product.colour, lead.size ? `size ${lead.size}` : null].filter(Boolean).join(", ");
  const messageSlot = lead.screenshot ? slots.get(lead.screenshot.src) : undefined;
  const rowId = "home-reviews";

  // tabIndex lets the hero's rating link hand focus to the chapter; the negative scroll margin lands
  // its heading just under the header, as the colour cards' does.
  return (
    <section
      id="reviews"
      tabIndex={-1}
      aria-labelledby="reviews-title"
      className="mx-auto flex max-w-6xl -scroll-mt-16 flex-col items-center gap-6 pt-16 outline-none md:-scroll-mt-28 md:px-8 md:pt-28"
    >
      <div className="flex max-w-2xl flex-col items-center gap-3 px-5 text-center">
        <h2 id="reviews-title" className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
          In their words.
        </h2>
        <p className="text-lg text-balance text-muted-foreground">From verified buyers, shared with their permission.</p>
      </div>

      <div id={rowId} className="flex w-full flex-col items-center gap-3">
        <figure className="mx-5 flex max-w-3xl flex-col items-center gap-5 self-stretch rounded-2xl bg-muted px-6 py-9 text-center md:mx-auto md:w-full md:px-12 md:py-14">
          <div className="flex items-center gap-3">
            <Stars rating={lead.rating} starClassName="size-4" />
            <VerifiedBadge />
          </div>
          <blockquote className="text-2xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
            <p>&ldquo;{lead.body}&rdquo;</p>
          </blockquote>
          <figcaption className="flex items-center gap-3 text-left">
            {lead.product.swatch ? <LeatherSwatch photo={lead.product.swatch} /> : null}
            <span className="flex flex-col">
              <span className="text-[0.9375rem] leading-snug font-medium">
                {lead.name}
                {lead.city ? `, ${lead.city}` : ""}
              </span>
              {bought ? (
                <Link href={`/products/${lead.product.handle}`} className="text-sm leading-snug text-muted-foreground underline-offset-[0.2em] hover:text-foreground hover:underline">
                  {bought.charAt(0).toUpperCase() + bought.slice(1)}
                </Link>
              ) : null}
            </span>
          </figcaption>
          {messageSlot !== undefined ? (
            <button type="button" data-open-photo={messageSlot} className="text-sm underline underline-offset-[0.2em] hover:no-underline">
              See the message
            </button>
          ) : null}
        </figure>

        {rest.length ? <ReviewRow id={`${rowId}-rest`} reviews={rest} slots={slots} linked={() => true} cardClassName="w-[80%] text-left" /> : null}
      </div>
      {rest.length > 1 ? <GalleryIndicator targetId={`${rowId}-rest`} total={rest.length} className="-mt-3 flex w-full gap-0.5 px-5 md:hidden" /> : null}
      {images.length ? <GalleryViewer targetId={rowId} title="what buyers sent" images={images} /> : null}
    </section>
  );
}
