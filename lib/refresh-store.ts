import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { STORE_TAG } from "@/lib/edge-cache";

// How long the purge waits after the response. Next records the revalidation in D1 while finishing
// the action, sometimes in the background; a visit before that would put the old page back in the cache.
const SETTLE_MS = 2000;

// Refreshes every store page after a change they show: stock, products, collections, content or
// settings. Next renders each page again on its next visit, and Workers Cache (lib/edge-cache.ts)
// drops its copies. Call it from a server action, in place of revalidatePath.
export async function refreshStore() {
  revalidatePath("/", "layout");
  const { ctx } = await getCloudflareContext({ async: true });
  const cache = ctx.cache;
  if (!cache) return; // next dev and the local preview have no Workers Cache
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const result = await cache.purge({ tags: [STORE_TAG] });
    if (!result.success) console.error("Workers Cache purge failed", result.errors);
  });
}
