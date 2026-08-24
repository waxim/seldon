import type { PsychohistoryEnv } from "../src/env.js";

declare global {
  namespace Cloudflare {
    interface Env extends PsychohistoryEnv {}
  }
}
