import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index.js";

async function call(path: string): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(`https://terminus.seldon.test${path}`),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

describe("terminus edge layer", () => {
  it("serves the console with security headers", async () => {
    const response = await call("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(await response.text()).toContain("Terminus");
  });

  it("serves the SPA for a deep link rather than a 404", async () => {
    const response = await call("/population/uk");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="root">');
  });

  it("proxies /api to the gateway, path prefix stripped", async () => {
    const response = await call("/api/healthz");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      service: "demerzel",
      status: "ok",
    });
  });
});
