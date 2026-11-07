"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// A hairline along the photo's bottom edge, one segment per photo, showing which is in view. The
// reviews' row of cards uses it too, placed under the row by `className`.
export function GalleryIndicator({
  targetId,
  total,
  className = "pointer-events-none absolute inset-x-0 bottom-0 flex gap-0.5 md:hidden",
}: {
  targetId: string;
  total: number;
  className?: string;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const track = document.getElementById(targetId);
    if (!track) return;
    // One step is an item and the gap after it: the whole width for photos, less for cards.
    const onScroll = () => {
      const item = track.querySelector<HTMLElement>("[data-slide]") ?? (track.firstElementChild as HTMLElement | null);
      const step = (item?.offsetWidth ?? track.clientWidth) + (parseFloat(getComputedStyle(track).columnGap) || 0);
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      const index = atEnd ? total - 1 : Math.round(track.scrollLeft / step);
      setCurrent(Math.min(total - 1, Math.max(0, index)));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [targetId, total]);

  return (
    <div aria-hidden className={className}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-0.5 flex-1 transition-colors duration-300",
            // Inactive segments stay readable on mid-grey backdrops as well as white ones.
            index === current ? "bg-foreground" : "bg-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
