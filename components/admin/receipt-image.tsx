"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

// A receipt screenshot at the column's width, up to 52% of the screen's height, so the next order
// stays in view. A taller one fades at the bottom, so a cut receipt never looks complete; the
// "Open full size" link sits right under it.
export function ReceiptImage({ src, alt }: { src: string; alt: string }) {
  const [cut, setCut] = useState(false);
  const measure = useCallback((image: HTMLImageElement | null) => {
    if (!image) return;
    const check = () => setCut(image.offsetHeight > (image.parentElement?.clientHeight ?? 0) + 1);
    // A cached image may finish before React attaches its handler.
    if (image.complete) check();
    image.addEventListener("load", check, { once: true });
  }, []);

  return (
    <a href={src} target="_blank" rel="noreferrer" className="group relative block max-h-[52vh] overflow-hidden rounded-2xl bg-muted">
      <Image
        ref={measure}
        src={src}
        alt={alt}
        width={0}
        height={0}
        unoptimized
        className="mx-auto h-auto w-full max-w-md transition-opacity group-hover:opacity-90"
      />
      {cut ? <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-muted to-transparent" /> : null}
    </a>
  );
}
