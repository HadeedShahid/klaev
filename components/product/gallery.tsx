import Image from "next/image";
import { ViewTransition } from "react";

import type { ProductImage } from "@/lib/catalog";

import { GalleryIndicator } from "./gallery-indicator";
import { GalleryViewer } from "./gallery-viewer";

// Phones swipe one photo at a time; wider screens see the photos as a grid.
// Every photo opens the full-screen viewer at that photo.
export function Gallery({ handle, title, images }: { handle: string; title: string; images: ProductImage[] }) {
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
            <li key={image.src} className="relative w-full shrink-0 snap-center snap-always">
              {index === 0 ? (
                <ViewTransition name={`product-photo-${handle}`} share="morph" default="none">
                  {photo}
                </ViewTransition>
              ) : (
                photo
              )}
              {/* Beside the photo rather than around it, so the photo stays an image to screen readers. */}
              <button
                type="button"
                data-open-photo={index}
                aria-label={`View photo ${index + 1} of ${images.length} larger`}
                className="absolute inset-0 cursor-zoom-in md:rounded-2xl"
              />
            </li>
          );
        })}
      </ul>
      {images.length > 1 ? <GalleryIndicator targetId={trackId} total={images.length} /> : null}
      <GalleryViewer targetId={trackId} title={title} images={images} />
    </div>
  );
}
