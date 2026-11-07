// The Worker's entry (wrangler.jsonc "main"): OpenNext's handler, with each response's caching set for
// Workers Cache by edgeCache() (lib/edge-cache.ts), and the daily schedule ("triggers" in
// wrangler.jsonc), which sends the review emails. Wrangler bundles this with the OpenNext build.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` exists only after `opennextjs-cloudflare build`
import handler from "./.open-next/worker.js";

import { edgeCache } from "./lib/edge-cache";
import { sendReviewRequests } from "./lib/review-requests";

export default {
  async fetch(request, env, ctx) {
    return edgeCache(request, await handler.fetch(request, env, ctx));
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendReviewRequests(env.DB, env.EMAIL));
  },
} satisfies ExportedHandler<CloudflareEnv>;
