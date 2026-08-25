import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Terminus's only real build step: the React SPA the Worker serves
 * (docs/12-deployment.md). Everything else in the monorepo ships
 * TypeScript source that Wrangler bundles at deploy time.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: true,
  },
});
