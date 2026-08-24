import { describe, expect, it } from "vitest";
import {
  geographyFor,
  nationForSeat,
  UK_SEAT_COUNTS,
  UK_SEAT_TOTAL,
} from "../src/index.js";

describe("uk geography", () => {
  it("shards at the constituency level", () => {
    const geography = geographyFor("uk");
    expect(geography.shardLevel).toBe("L3");
    expect(geography.levels.L3.name).toBe("constituency");
    expect(geography.levels.L3.approximateCount).toBe(650);
  });

  it("reads the nation out of a GSS code", () => {
    expect(nationForSeat("E14001156")).toBe("england");
    expect(nationForSeat("S14000024")).toBe("scotland");
    expect(nationForSeat("W07000081")).toBe("wales");
    expect(nationForSeat("N05000012")).toBe("ni");
    expect(() => nationForSeat("X99000001")).toThrow(/unrecognised/);
  });

  it("keeps the reference seat counts adding up to 650", () => {
    expect(UK_SEAT_TOTAL).toBe(650);
    expect(UK_SEAT_COUNTS.ni).toBe(18);
  });
});
