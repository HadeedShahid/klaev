import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

import { DEVICE_SIZES, IMAGE_SIZES } from "./lib/media";
import { SHOPIFY_REDIRECTS } from "./lib/shopify-redirects";

const nextConfig: NextConfig = {
  async redirects() {
    return SHOPIFY_REDIRECTS;
  },
  images: {
    // No resizing in this app: product photos are stored in R2 at exactly these widths (lib/media.ts).
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    deviceSizes: DEVICE_SIZES,
    imageSizes: IMAGE_SIZES,
  },
  experimental: {
    // Pages read the local D1 database while building, and Wrangler's local copy fails at random
    // when several build workers open it at once. One worker is still quick for a dozen pages.
    cpus: 1,
    // On 25 October 2026 a warm build cache shipped a stale app/globals.css (new rules missing) to
    // the Worker build. Builds take seconds, and a deploy must carry exactly what is in the files.
    turbopackFileSystemCacheForBuild: false,
    // Receipt screenshots go up through a Server Action (app/actions/receipts.ts), and phone
    // screenshots run to a few MB. 10 MB plus room for the form's own bytes.
    serverActions: { bodySizeLimit: "11mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default function config(phase: string): NextConfig {
  // Cloudflare bindings for `next dev`, through getCloudflareContext(). Builds don't need this:
  // each build worker connects on its own, and a connection here would open the database twice.
  if (phase === PHASE_DEVELOPMENT_SERVER) initOpenNextCloudflareForDev();
  return nextConfig;
}
