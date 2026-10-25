import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// The catalog is a build-time snapshot, so prerendered pages are served read-only from static assets.
// Cache interception stays off because it does not work with partial prerendering.
// When products live in D1 and edits must refresh pages, switch to the R2 incremental cache.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
