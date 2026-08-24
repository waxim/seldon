import type { TerminusEnv } from "../src/index.js";

declare global {
  namespace Cloudflare {
    interface Env extends TerminusEnv {}
  }
}
