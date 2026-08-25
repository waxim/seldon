import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import config from "../../config/environments.json" with { type: "json" };
import { serviceStubWorkers } from "../../config/test-stubs.mjs";

/**
 * Two projects, because Terminus is two programs: a Worker edge layer that
 * has to run inside workerd with Miniflare-simulated bindings, and a React
 * console that has to run in a DOM.
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            singleWorker: true,
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              workers: serviceStubWorkers(["demerzel"], {
                date: config.compatibilityDate,
                flags: config.compatibilityFlags,
              }),
            },
          }),
        ],
        test: { name: "worker", include: ["test/**/*.test.ts"] },
      },
      {
        plugins: [react()],
        test: {
          name: "console",
          include: ["web/**/*.test.ts", "web/**/*.test.tsx"],
          environment: "happy-dom",
          setupFiles: ["./web/test-setup.ts"],
        },
      },
    ],
  },
});
