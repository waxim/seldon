import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { SecondFoundationEntrypoint } from "../src/entrypoint.js";
import worker from "../src/index.js";

const entrypoint = () =>
  new SecondFoundationEntrypoint(createExecutionContext(), env);

describe("second foundation", () => {
  it("reports its own health", async () => {
    expect(await entrypoint().health()).toMatchObject({
      service: "second-foundation",
      status: "ok",
    });
  });

  it("sweeps every service it watches", async () => {
    const reports = await entrypoint().watch();
    expect(reports.map((report) => report.service)).toEqual([
      "radiant",
      "vault",
      "encyclopedia",
      "psychohistory",
    ]);
  });

  it("runs the watch on its cron trigger", async () => {
    const ctx = createExecutionContext();
    await worker.scheduled(
      {
        cron: "0 * * * *",
        scheduledTime: Date.now(),
        noRetry: () => undefined,
      },
      env,
      ctx,
    );
    // The sweep is deliberately fire-and-forget; the assertion is that a
    // scheduled invocation completes without throwing.
    expect(true).toBe(true);
  });

  it("has no public routes", () => {
    expect(worker.fetch().status).toBe(404);
  });
});
