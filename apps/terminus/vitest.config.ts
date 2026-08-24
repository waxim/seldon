import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import config from "../../config/environments.json" with { type: "json" };
import { serviceStubWorkers } from "../../config/test-stubs.mjs";

/**
 * Tests run inside workerd with Miniflare-simulated bindings.
 */

export default defineConfig({
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
  test: {
    include: ["test/**/*.test.ts"],
  },
});
