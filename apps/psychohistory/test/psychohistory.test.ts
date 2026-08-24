import {
  createExecutionContext,
  createMessageBatch,
  env,
  getQueueResult,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { PsychohistoryEntrypoint } from "../src/entrypoint.js";
import type { SimTask } from "../src/env.js";
import worker from "../src/index.js";

const entrypoint = () =>
  new PsychohistoryEntrypoint(createExecutionContext(), env);

describe("run coordinator", () => {
  it("starts idle and remembers a started run", async () => {
    const id = env.COORDINATOR_DO.idFromName("run_01j9dq3zx8k7abcdefghjkmnpq");
    const coordinator = env.COORDINATOR_DO.get(id);
    expect(await coordinator.progress()).toMatchObject({ status: "idle" });

    await coordinator.begin("run_01j9dq3zx8k7abcdefghjkmnpq", 650);
    expect(await coordinator.progress()).toMatchObject({
      status: "queued",
      seatsTotal: 650,
      seatsDone: 0,
    });
  });

  it("is addressable by run id through the entrypoint", async () => {
    const progress = await entrypoint().runProgress("run_unknown");
    expect(progress.status).toBe("idle");
  });
});

describe("engine", () => {
  it("pins its version server-side", async () => {
    expect(await entrypoint().engineVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("reports health", async () => {
    expect(await entrypoint().health()).toMatchObject({
      service: "psychohistory",
      status: "ok",
    });
  });

  it("acks a simulation task and retries an unknown payload version", async () => {
    const task: SimTask = {
      v: 1,
      runId: "run_01j9dq3zx8k7abcdefghjkmnpq",
      worldId: "uk",
      seatId: "E14001156",
      iterations: 1000,
    };
    const batch = createMessageBatch<SimTask>("seldon-sim-tasks-dev", [
      { id: "1", timestamp: new Date(1000), attempts: 1, body: task },
      {
        id: "2",
        timestamp: new Date(1000),
        attempts: 1,
        body: { ...task, v: 2 as unknown as 1 },
      },
    ]);
    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    const result = await getQueueResult(batch, ctx);
    expect(result.explicitAcks).toEqual(["1"]);
    expect(result.retryMessages).toEqual([{ msgId: "2" }]);
  });

  it("has no public routes", () => {
    expect(worker.fetch().status).toBe(404);
  });
});
