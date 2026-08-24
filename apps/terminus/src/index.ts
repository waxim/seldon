/**
 * Terminus — the console (docs/09-terminus.md).
 *
 * A Worker with static assets: the SPA is the product, this edge layer
 * only serves it, adds security headers, and proxies `/api/*` to the
 * gateway so the console is same-origin under one Access application.
 * The browser still speaks nothing but `@seldon/client`.
 */
import type { SeldonEnvironment } from "@seldon/foundation";

export interface TerminusEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;
  ASSETS: Fetcher;
  DEMERZEL: Fetcher;
}

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
  // MapLibre needs workers and blob URLs; tiles arrive through the API.
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
};

export default {
  async fetch(
    request: Request,
    env: TerminusEnv,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const forwarded = new URL(request.url);
      forwarded.pathname = url.pathname.replace(/^\/api/, "") || "/";
      // The Access assertion rides along on the original headers, so the
      // gateway re-validates it exactly as it would a direct call.
      return env.DEMERZEL.fetch(new Request(forwarded, request));
    }

    const response = await env.ASSETS.fetch(request);
    const withHeaders = new Response(response.body, response);
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      withHeaders.headers.set(header, value);
    }
    return withHeaders;
  },
} satisfies ExportedHandler<TerminusEnv>;
