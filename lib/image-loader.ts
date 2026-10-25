import { MEDIA_URL, MEDIA_WIDTHS } from "./media";

// next/image hands every image to this loader instead of the built-in optimizer. It is a plain
// function with no directive so server code (getImageProps in the hero) can call it too.
// Product photos point at the stored copy for the requested width (lib/media.ts).
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (src.startsWith(`${MEDIA_URL}/`) && src.endsWith(".webp")) {
    const stored = MEDIA_WIDTHS.find((candidate) => candidate >= width) ?? MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];
    return `${src.slice(0, -".webp".length)}-${stored}.webp`;
  }
  return `${src}?w=${width}`;
}
