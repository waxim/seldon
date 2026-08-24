import type { SecondFoundationEnv } from "../src/env.js";

declare global {
  namespace Cloudflare {
    interface Env extends SecondFoundationEnv {}
  }
}
