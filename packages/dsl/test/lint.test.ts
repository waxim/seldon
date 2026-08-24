import { SeldonError } from "@seldon/foundation";
import { describe, expect, it } from "vitest";
import { assertFieldsKnown, lintFields } from "../src/lint.js";
import { UK_FIELD_REGISTRY } from "../src/registry.js";

const lint = (source: string) => lintFields(UK_FIELD_REGISTRY, source);

describe("field lint", () => {
  it("passes the worked predicates from the design doc", () => {
    const worked = [
      "sex == male && age > 50 && !degree && income < 50k",
      'nation == scotland && ageBand in ["18-24", "25-34"] && tenure == private-rent',
      "redWall && incumbent == lab && marginality2024 < 0.05",
      "deprivation <= 2 && urbanRural == rural && activity == retired",
    ];
    for (const source of worked) {
      expect(lint(source), source).toEqual([]);
    }
  });

  it("turns a misspelt field into a positional dsl_error", () => {
    const [error] = lint("age > 50 && incom < 50000");
    expect(error).toBeInstanceOf(SeldonError);
    expect(error?.code).toBe("dsl_error");
    expect(error?.message).toBe("unknown field 'incom' in predicate");
    expect(error?.details).toEqual({
      position: { line: 1, column: 13 },
      suggestion: "income",
    });
  });

  it("reads a magnitude suffix as part of the number", () => {
    expect(lint("income < 50k")).toEqual([]);
    expect(lint("income > 2m && age > 18")).toEqual([]);
  });

  it("does not mistake an enum value for a field", () => {
    expect(lint("tenure == social-rent")).toEqual([]);
    expect(lint("region in [london, south-east]")).toEqual([]);
  });

  it("ignores quoted tokens", () => {
    expect(lint('ageBand == "18-24"')).toEqual([]);
    expect(lint('seat == "hackney-north"')).toEqual([]);
  });

  it("reports every unknown field, not just the first", () => {
    expect(lint("agee > 50 && incom < 3").map((e) => e.message)).toEqual([
      "unknown field 'agee' in predicate",
      "unknown field 'incom' in predicate",
    ]);
  });

  it("throws on the compile-error path", () => {
    expect(() => assertFieldsKnown(UK_FIELD_REGISTRY, "agee > 50")).toThrow(
      /unknown field 'agee'/,
    );
    expect(() =>
      assertFieldsKnown(UK_FIELD_REGISTRY, "age > 50"),
    ).not.toThrow();
  });
});
