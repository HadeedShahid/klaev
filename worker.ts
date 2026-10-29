// The Worker's entry (wrangler.jsonc "main"): OpenNext's handler, with each response's caching set for
// Workers Cache by edgeCache() (lib/edge-cache.ts). Wrangler bundles this with the OpenNext build.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` exists only after `opennextjs-cloudflare build`
import handler from "./.open-next/worker.js";

import { edgeCache } from "./lib/edge-cache";

export default {
  async fetch(request, env, ctx) {
    return edgeCache(request, await handler.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<CloudflareEnv>;
