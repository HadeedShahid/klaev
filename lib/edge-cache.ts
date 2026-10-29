// Store pages are cached in front of the Worker by Workers Cache ("cache" in wrangler.jsonc): a cached
// page reaches the shopper without the Worker running, so it costs no CPU and no database read.
// worker.ts passes every response through edgeCache(). Next marks the pages it keeps with s-maxage;
// those are kept for a day at most, under one tag that refreshStore() (lib/refresh-store.ts) purges
// whenever something they show changes. The day bounds a purge that fails.
// Everything else is marked no-store for Cloudflare only (Cloudflare-CDN-Cache-Control), because
// Workers Cache would otherwise keep some of it anyway: a 200 with no Cache-Control for two hours,
// which for an admin file would hand it to anyone with the link. Browsers still follow Cache-Control.
// Runs in worker.ts, outside Next, so it imports nothing.

export const STORE_TAG = "store";

const KEEP = "public, max-age=0, s-maxage=86400";
const NEVER = "private, no-cache, no-store, max-age=0, must-revalidate";

export function edgeCache(request: Request, response: Response): Response {
  const cacheControl = response.headers.get("cache-control") ?? "";
  const { pathname } = new URL(request.url);
  const keep =
    cacheControl.includes("s-maxage") &&
    (request.method === "GET" || request.method === "HEAD") &&
    response.status === 200 &&
    !response.headers.has("set-cookie") &&
    !cacheControl.includes("private") &&
    !cacheControl.includes("no-store") &&
    !/^\/(admin|api)(\/|$)/.test(pathname);

  const headers = new Headers(response.headers);
  if (keep) {
    headers.set("cache-control", KEEP);
    headers.set("cache-tag", STORE_TAG);
  } else {
    headers.set("cloudflare-cdn-cache-control", "no-store");
    if (cacheControl.includes("s-maxage")) headers.set("cache-control", NEVER);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
