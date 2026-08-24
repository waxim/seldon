import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import config from "../../config/environments.json" with { type: "json" };
import { serviceStubWorkers } from "../../config/test-stubs.mjs";

/**
 * Tests run inside workerd with Miniflare-simulated bindings, and the
 * service's D1 is booted from its own migration chain — so a broken
 * migration fails the pull request, not the deploy
 * (docs/12-deployment.md).
 */

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      singleWorker: true,
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
        workers: serviceStubWorkers(
          [
            "radiant",
            "vault",
            "encyclopedia",
            "psychohistory",
            "second-foundation",
          ],
          {
            date: config.compatibilityDate,
            flags: config.compatibilityFlags,
          },
        ),
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
  },
}));
