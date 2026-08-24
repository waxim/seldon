import { describe, expect, it } from "vitest";
import { partyByCode, resolveParty, UK_PARTIES } from "../src/index.js";

describe("party registry", () => {
  it("has unique codes and colours", () => {
    const codes = UK_PARTIES.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    const colours = UK_PARTIES.map((p) => p.colour);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it("resolves the spellings published sources actually use", () => {
    expect(resolveParty("uk", "Labour and Co-operative")?.code).toBe("lab");
    expect(resolveParty("uk", "  SNP ")?.code).toBe("snp");
    expect(resolveParty("uk", "Sinn Féin")?.code).toBe("sf");
    expect(resolveParty("uk", "Monster Raving Loony")).toBeUndefined();
  });

  it("scopes NI parties to NI", () => {
    expect(partyByCode("uk", "dup")?.nations).toEqual(["ni"]);
  });

  it("refuses a world it has no registry for", () => {
    expect(() => resolveParty("atlantis", "lab")).toThrow(/no party registry/);
  });
});
