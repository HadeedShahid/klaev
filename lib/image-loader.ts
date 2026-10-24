// next/image hands every image to this loader instead of the built-in optimizer. It is a plain
// function with no directive so server code (getImageProps in the hero) can call it too.
// Product photos still live on the Shopify CDN, which resizes on request and serves WebP
// to browsers that accept it. When they move to R2, this becomes a Cloudflare Images URL.
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://cdn.shopify.com/")) {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    return url.toString();
  }
  return `${src}?w=${width}`;
}
