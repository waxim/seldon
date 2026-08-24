import {
  createExecutionContext,
  createMessageBatch,
  env,
  getQueueResult,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { SynthTask } from "../src/env.js";
import worker from "../src/index.js";

const task = (seatId: string): SynthTask => ({
  v: 1,
  worldId: "uk",
  seatId,
  epochId: "ep_5f9c2a1d44e0",
});

describe("synthesis fan-out", () => {
  it("claims one seat per message", async () => {
    const batch = createMessageBatch<SynthTask>("seldon-synth-tasks-dev", [
      {
        id: "1",
        timestamp: new Date(1000),
        attempts: 1,
        body: task("W07000008"),
      },
    ]);
    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    const result = await getQueueResult(batch, ctx);
    expect(result.explicitAcks).toEqual(["1"]);

    const shard = env.SHARD_DO.get(env.SHARD_DO.idFromName("uk:W07000008"));
    expect((await shard.describe()).schemaVersion).toBe(1);
  });

  it("retries a payload from a version it does not understand", async () => {
    const batch = createMessageBatch<SynthTask>("seldon-synth-tasks-dev", [
      {
        id: "2",
        timestamp: new Date(1000),
        attempts: 1,
        body: { ...task("S14000024"), v: 2 as unknown as 1 },
      },
    ]);
    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    const result = await getQueueResult(batch, ctx);
    expect(result.retryMessages).toEqual([{ msgId: "2" }]);
  });
});
