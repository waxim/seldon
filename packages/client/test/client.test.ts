import { SeldonError } from "@seldon/foundation";
import { describe, expect, it } from "vitest";
import { createClient } from "../src/client.js";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });

describe("createClient", () => {
  it("parses a health report against the route schema", async () => {
    const client = createClient({
      baseUrl: "https://api.example/",
      fetch: async (input) => {
        expect(String(input)).toBe("https://api.example/healthz");
        return jsonResponse({
          service: "demerzel",
          status: "ok",
          environment: "staging",
          version: "abc1234",
        });
      },
    });
    await expect(client.health()).resolves.toMatchObject({ status: "ok" });
  });

  it("surfaces the error envelope as a typed SeldonError", async () => {
    const client = createClient({
      baseUrl: "https://api.example",
      fetch: async () =>
        jsonResponse(
          {
            error: {
              code: "dsl_error",
              message: "unknown field 'incom' in predicate",
              details: { suggestion: "income" },
            },
          },
          { status: 400, headers: { "seldon-request-id": "req_01j9ab7f" } },
        ),
    });

    const error = await client.worlds.list().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SeldonError);
    expect((error as SeldonError).code).toBe("dsl_error");
    expect((error as SeldonError).requestId).toBe("req_01j9ab7f");
  });

  it("reports an unreachable gateway as unavailable", async () => {
    const client = createClient({
      baseUrl: "https://api.example",
      fetch: async () => {
        throw new TypeError("network down");
      },
    });
    const error = await client.health().catch((e: unknown) => e);
    expect((error as SeldonError).code).toBe("unavailable");
  });

  it("sends Access service-token headers when configured", async () => {
    let seen: Headers | undefined;
    const client = createClient({
      baseUrl: "https://api.example",
      serviceToken: { clientId: "id", clientSecret: "secret" },
      fetch: async (_input, init) => {
        seen = new Headers(init?.headers);
        return jsonResponse({ items: [] });
      },
    });
    await client.worlds.list();
    expect(seen?.get("cf-access-client-id")).toBe("id");
    expect(seen?.get("cf-access-client-secret")).toBe("secret");
  });
});
