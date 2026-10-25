import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // Server modules are imported directly in tests; outside React Server Components the marker would throw.
    alias: { "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx", "scripts/**/*.test.ts"],
  },
});
