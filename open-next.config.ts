import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Product and collection pages render on the Worker on first visit and are kept in R2 (the
// NEXT_INC_CACHE_R2_BUCKET binding). Keys include the build id, so every deploy starts fresh.
// Cache interception stays off because it does not work with partial prerendering.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
