import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// Pages render on the Worker on first visit and are kept in R2 (the NEXT_INC_CACHE_R2_BUCKET binding).
// Keys include the build id, so every deploy starts fresh. revalidatePath records the time in D1
// (NEXT_TAG_CACHE_D1), and the next visit renders the page again: an order that sells out a size uses it.
// Cache interception stays off because it does not work with partial prerendering.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
});
