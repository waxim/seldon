import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { VaultEntrypoint } from "../src/entrypoint.js";
import worker from "../src/index.js";

const entrypoint = () => new VaultEntrypoint(createExecutionContext(), env);

describe("vault", () => {
  it("boots its D1 from the migration chain", async () => {
    const row = await env.VAULT_DB.prepare(
      "SELECT COUNT(*) AS tables FROM sqlite_master WHERE type = 'table' AND name IN ('scenarios','questions','runs','outcomes')",
    ).first<{ tables: number }>();
    expect(row?.tables).toBe(4);
  });

  it("reports health", async () => {
    const report = await entrypoint().health();
    expect(report).toMatchObject({ service: "vault", status: "ok" });
  });

  it("has an honestly empty archive", async () => {
    expect(await entrypoint().listRuns()).toEqual([]);
  });

  it("has no public routes", async () => {
    expect(worker.fetch().status).toBe(404);
  });
});
