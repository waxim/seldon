import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  contentHashId,
  EpochId,
  formatAuthoredId,
  HouseholdId,
  parseAuthoredId,
  parseCompositeId,
  RunId,
  SeatId,
  shardNameFor,
} from "../src/ids.js";

describe("content-hash ids", () => {
  it("accepts the documented shape and rejects near misses", () => {
    expect(EpochId.is("ep_5f9c2a1d44e0")).toBe(true);
    expect(EpochId.is("ep_5F9C2A1D44E0")).toBe(false);
    expect(EpochId.is("ep_5f9c2a1d44")).toBe(false);
    expect(EpochId.is("fk_5f9c2a1d44e0")).toBe(false);
    expect(() => EpochId.parse("nonsense")).toThrow();
  });

  it("is stable for the same inputs regardless of key order", async () => {
    const a = await contentHashId("ep", { worldId: "uk", seed: 7 });
    const b = await contentHashId("ep", { seed: 7, worldId: "uk" });
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^ep_[0-9a-f]{12}$/);
    expect(a.fullHash).toHaveLength(64);
  });

  it("canonicalises nested structures and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: [3, { d: 4, c: undefined }] })).toBe(
      '{"a":[3,{"d":4}],"b":1}',
    );
  });
});

describe("time-sortable ids", () => {
  it("accepts a lowercase ULID behind its prefix", () => {
    expect(RunId.is("run_01j9dq3zx8k7abcdefghjkmnpq")).toBe(true);
    expect(RunId.is("run_01J9DQ3ZX8K7ABCDEFGHJKMNPQ")).toBe(false);
    // 'u' is not in Crockford base32.
    expect(RunId.is("run_01j9dq3zx8k7abcdefghjkmnpu")).toBe(false);
  });
});

describe("world-scoped composite ids", () => {
  it("locates the owning shard from the id alone", () => {
    expect(shardNameFor("uk:E14001156:hh:00b3c1")).toBe("uk:E14001156");
  });

  it("parses each part", () => {
    expect(parseCompositeId("uk:E14001156:p:01a2f0")).toEqual({
      worldId: "uk",
      seatId: "E14001156",
      kind: "p",
      local: "01a2f0",
    });
  });

  it("discriminates kinds", () => {
    expect(HouseholdId.is("uk:E14001156:hh:00b3c1")).toBe(true);
    expect(HouseholdId.is("uk:E14001156:p:00b3c1")).toBe(false);
  });

  it("rejects a code that is not a GSS constituency", () => {
    expect(SeatId.is("E14001156")).toBe(true);
    expect(SeatId.is("E09000001")).toBe(false);
    expect(() => parseCompositeId("uk:NOTASEAT:hh:01")).toThrow();
  });
});

describe("authored ids", () => {
  it("round-trips slug@version", () => {
    const id = parseAuthoredId("general-election-today@4");
    expect(id).toEqual({ slug: "general-election-today", version: 4 });
    expect(formatAuthoredId(id)).toBe("general-election-today@4");
  });
});

describe("newUlid", () => {
  it("sorts lexicographically by creation time", async () => {
    const { newPrefixedUlid, newUlid } = await import("../src/ids.js");
    const early = newUlid(1_700_000_000_000);
    const late = newUlid(1_800_000_000_000);
    expect(early < late).toBe(true);
    expect(newPrefixedUlid("run")).toMatch(
      /^run_[0-9abcdefghjkmnpqrstvwxyz]{26}$/,
    );
    expect(RunId.is(newPrefixedUlid("run"))).toBe(true);
  });
});
