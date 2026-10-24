import Image from "next/image";
import { ViewTransition } from "react";

import type { ProductImage } from "@/lib/catalog";

import { GalleryIndicator } from "./gallery-indicator";

// Phones swipe one photo at a time; wider screens see the photos as a grid.
export function Gallery({ handle, images }: { handle: string; images: ProductImage[] }) {
  const trackId = `gallery-${handle}`;

  return (
    <div className="relative">
      <ul
        id={trackId}
        aria-label="Photos"
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-2 md:gap-2 md:overflow-visible"
      >
        {images.map((image, index) => {
          const photo = (
            <Image
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              sizes="(min-width: 768px) 30vw, 100vw"
              preload={index === 0}
              // On phones the photo yields enough height for the name and price to share the first screen.
              className="h-[min(125vw,calc(100svh-17rem))] w-full bg-muted object-cover object-[50%_30%] md:aspect-4/5 md:h-auto md:rounded-2xl md:object-center"
            />
          );
          return (
            <li key={image.src} className="w-full shrink-0 snap-center snap-always">
              {index === 0 ? (
                <ViewTransition name={`product-photo-${handle}`} share="morph" default="none">
                  {photo}
                </ViewTransition>
              ) : (
                photo
              )}
            </li>
          );
        })}
      </ul>
      {images.length > 1 ? <GalleryIndicator targetId={trackId} total={images.length} /> : null}
    </div>
  );
}
