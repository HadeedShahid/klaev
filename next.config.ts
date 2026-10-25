import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Resizing happens at the image's own CDN (Shopify for now, Cloudflare later), not in this app.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
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

export default nextConfig;

// Makes Cloudflare bindings available to `next dev` through getCloudflareContext().
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
