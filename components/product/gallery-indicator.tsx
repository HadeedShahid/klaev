"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// A hairline along the photo's bottom edge, one segment per photo, showing which is in view.
export function GalleryIndicator({ targetId, total }: { targetId: string; total: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const track = document.getElementById(targetId);
    if (!track) return;
    const onScroll = () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      setCurrent(Math.min(total - 1, Math.max(0, index)));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [targetId, total]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-0.5 md:hidden">
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
