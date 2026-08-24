import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { RadiantEntrypoint } from "../src/entrypoint.js";
import worker from "../src/index.js";

const entrypoint = () => new RadiantEntrypoint(createExecutionContext(), env);

describe("seat shards", () => {
  it("migrates its own SQLite schema on first touch", async () => {
    const id = env.SHARD_DO.idFromName("uk:E14001156");
    const shard = env.SHARD_DO.get(id);
    const described = await shard.describe();
    expect(described.schemaVersion).toBe(1);
    expect(described.epochId).toBeNull();
  });

  it("claims a seat idempotently", async () => {
    const id = env.SHARD_DO.idFromName("uk:E14000530");
    const shard = env.SHARD_DO.get(id);
    await shard.claim("uk", "E14000530");
    await shard.claim("uk", "E14000530");
    expect((await shard.describe()).schemaVersion).toBe(1);
  });

  it("routes an entity id to its owning shard with no lookup hop", async () => {
    const described = await entrypoint().describeShardFor(
      "uk:E14001156:hh:00b3c1",
    );
    expect(described.shard).toBe("uk:E14001156");
  });

  it("rejects a malformed id at the boundary", async () => {
    await expect(entrypoint().describeShardFor("not-an-id")).rejects.toThrow(
      /malformed id/,
    );
  });
});

describe("registry", () => {
  it("boots its D1 from the migration chain", async () => {
    const row = await env.RADIANT_DB.prepare(
      "SELECT world_id, name FROM worlds WHERE world_id = 'uk'",
    ).first<{ world_id: string; name: string }>();
    expect(row?.name).toBe("United Kingdom");
  });

  it("reports health across its bindings", async () => {
    const report = await entrypoint().health();
    expect(report.service).toBe("radiant");
    expect(report.status).toBe("ok");
    expect(report.checks?.map((check) => check.name)).toEqual([
      "RADIANT_DB",
      "SHARD_DO",
    ]);
  });

  it("lists the one world, honestly epoch-less", async () => {
    const [world] = await entrypoint().listWorlds();
    expect(world).toMatchObject({
      worldId: "uk",
      seatCount: 650,
      epochId: null,
    });
  });
});

describe("public surface", () => {
  it("has none", async () => {
    const response = worker.fetch();
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("no public routes");
  });
});
