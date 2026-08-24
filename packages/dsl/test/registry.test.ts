import { describe, expect, it } from "vitest";
import {
  fieldNames,
  fieldRegistryFor,
  suggestField,
  UK_FIELD_REGISTRY,
} from "../src/registry.js";

describe("field registry", () => {
  it("carries every field the design table lists", () => {
    const names = fieldNames(UK_FIELD_REGISTRY);
    for (const field of [
      "sex",
      "age",
      "ageBand",
      "qualification",
      "degree",
      "activity",
      "registered",
      "income",
      "tenure",
      "householdSize",
      "housePriceBand",
      "energyBand",
      "deprivation",
      "urbanRural",
      "seat",
      "region",
      "nation",
      "marginality2024",
      "incumbent",
      "redWall",
      "blueWall",
    ]) {
      expect(names).toContain(field);
    }
  });

  it("types each field on the documented axis and layer", () => {
    const tenure = UK_FIELD_REGISTRY.fields.get("tenure");
    expect(tenure).toMatchObject({ type: "enum", axis: "household" });
    const degree = UK_FIELD_REGISTRY.fields.get("degree");
    expect(degree).toMatchObject({
      type: "boolean",
      sugarFor: "qualification == level4plus",
    });
  });

  it("suggests the field a typo meant", () => {
    expect(suggestField(UK_FIELD_REGISTRY, "incom")).toBe("income");
    expect(suggestField(UK_FIELD_REGISTRY, "agee")).toBe("age");
    expect(suggestField(UK_FIELD_REGISTRY, "zzzzzzzzzzzz")).toBeUndefined();
  });

  it("refuses a world it has no registry for", () => {
    expect(() => fieldRegistryFor("atlantis")).toThrow(/no field registry/);
  });
});
