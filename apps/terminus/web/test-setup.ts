import { vi } from "vitest";

/**
 * Runs before the console's test modules are imported, so the stub is in
 * place by the time `@seldon/client` binds `globalThis.fetch`.
 *
 * There is no gateway in a unit test. The console has to render its
 * screens whether or not the API answers, so every call 503s here.
 */
vi.stubGlobal(
  "fetch",
  vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: { code: "unavailable", message: "no gateway in tests" },
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      ),
  ),
);
