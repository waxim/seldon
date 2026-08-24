/**
 * `@seldon/client` — the only way the outside speaks to Seldon.
 *
 * Terminus consumes this and nothing else: no hand-rolled fetches, so the
 * route registry stays the contract (docs/09-terminus.md).
 */
import {
  type HealthReport,
  SeldonError,
  SeldonErrorEnvelopeSchema,
} from "@seldon/foundation";
import { ROUTES, type WorldSummary } from "./routes.js";

export interface ClientOptions {
  /** Demerzel's base URL — same-origin `/api` in the browser. */
  baseUrl: string;
  /** Injectable for tests and for Workers-side calls. */
  fetch?: typeof globalThis.fetch;
  /**
   * Access service-token pair, for automation. Browsers send the Access
   * cookie instead and set neither of these.
   */
  serviceToken?: { clientId: string; clientSecret: string };
  signal?: AbortSignal;
}

export interface SeldonClient {
  health(): Promise<HealthReport>;
  deepHealth(): Promise<HealthReport>;
  worlds: { list(): Promise<WorldSummary[]> };
}

export function createClient(options: ClientOptions): SeldonClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const base = options.baseUrl.replace(/\/$/, "");

  async function call<T>(
    path: string,
    parse: (value: unknown) => T,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.serviceToken) {
      headers["cf-access-client-id"] = options.serviceToken.clientId;
      headers["cf-access-client-secret"] = options.serviceToken.clientSecret;
    }

    let response: Response;
    try {
      response = await doFetch(`${base}${path}`, {
        headers,
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (cause) {
      throw new SeldonError("unavailable", `cannot reach ${base}${path}`, {
        cause,
      });
    }

    const requestId = response.headers.get("seldon-request-id") ?? undefined;
    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const envelope = SeldonErrorEnvelopeSchema.safeParse(body);
      if (envelope.success) {
        const { code, message, details } = envelope.data.error;
        throw new SeldonError(code, message, {
          ...(details ? { details } : {}),
          ...(requestId ? { requestId } : {}),
        });
      }
      throw new SeldonError(
        "internal",
        `unexpected ${response.status} from ${path}`,
        { ...(requestId ? { requestId } : {}) },
      );
    }

    return parse(body);
  }

  return {
    health: () =>
      call(ROUTES.health.path, (value) => ROUTES.health.response.parse(value)),
    deepHealth: () =>
      call(ROUTES.deepHealth.path, (value) =>
        ROUTES.deepHealth.response.parse(value),
      ),
    worlds: {
      list: () =>
        call(
          ROUTES.listWorlds.path,
          (value) => ROUTES.listWorlds.response.parse(value).items,
        ),
    },
  };
}
