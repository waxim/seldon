import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import type { VaultEnv } from "../src/env.js";

declare global {
  namespace Cloudflare {
    interface Env extends VaultEnv {
      /** Injected by vitest.config.ts, for the setup file. */
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
