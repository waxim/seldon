import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { EncyclopediaEntrypoint } from "../src/entrypoint.js";
import worker from "../src/index.js";

const entrypoint = () =>
  new EncyclopediaEntrypoint(createExecutionContext(), env);

describe("encyclopedia", () => {
  it("boots its catalogue from the migration chain", async () => {
    const row = await env.ENCYCLOPEDIA_DB.prepare(
      "SELECT COUNT(*) AS tables FROM sqlite_master WHERE type = 'table' AND name IN ('sources','locks','ingest_runs','data_versions')",
    ).first<{ tables: number }>();
    expect(row?.tables).toBe(4);
  });

  it("reports health", async () => {
    const report = await entrypoint().health();
    expect(report).toMatchObject({ service: "encyclopedia", status: "ok" });
  });

  it("lists no sources until P1 lands them", async () => {
    expect(await entrypoint().listSources("uk")).toEqual([]);
  });

  it("has no public routes", async () => {
    expect(worker.fetch().status).toBe(404);
  });
});
