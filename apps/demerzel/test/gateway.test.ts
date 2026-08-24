import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index.js";

async function call(path: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(`https://api.seldon.test${path}`, init),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

describe("gateway", () => {
  it("answers shallow health and stamps a request id", async () => {
    const response = await call("/healthz");
    expect(response.status).toBe(200);
    expect(response.headers.get("seldon-request-id")).toMatch(/^req_/);
    expect(await response.json()).toMatchObject({
      service: "demerzel",
      status: "ok",
      environment: "dev",
    });
  });

  it("walks every service binding on deep health", async () => {
    const response = await call("/healthz/deep");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      checks: { name: string; status: string }[];
    };
    expect(body.status).toBe("ok");
    expect(body.checks.map((check) => check.name)).toEqual([
      "radiant",
      "vault",
      "encyclopedia",
      "psychohistory",
      "second-foundation",
    ]);
  });

  it("routes a request through to Radiant over RPC", async () => {
    const response = await call("/worlds");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          worldId: "uk",
          name: "United Kingdom",
          epochId: null,
          seatCount: 650,
        },
      ],
    });
  });

  it("describes itself in OpenAPI", async () => {
    const body = (await (await call("/openapi.json")).json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(body.openapi).toBe("3.1.0");
    expect(Object.keys(body.paths)).toContain("/worlds");
  });

  it("returns the one error envelope for an unknown route", async () => {
    const response = await call("/nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "not_found", requestId: expect.stringMatching(/^req_/) },
    });
  });

  it("audits a mutating request and leaves reads alone", async () => {
    await call("/worlds");
    await call("/nope", { method: "POST" });
    const rows = await env.DEMERZEL_DB.prepare(
      "SELECT method, path, status, actor, role FROM audit_log",
    ).all<{ method: string; path: string; status: number; actor: string }>();
    expect(rows.results).toEqual([
      {
        method: "POST",
        path: "/nope",
        status: 404,
        actor: "dev@localhost",
        role: "owner",
      },
    ]);
  });
});
