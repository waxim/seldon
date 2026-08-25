import { describe, expect, it, vi } from "vitest";
import { fuzzyMatch, rankBy } from "../src/lib/fuzzy.js";
import { looksLikePredicate } from "../src/lib/predicate.js";
import {
  applyTheme,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  THEME_STORAGE_KEY,
} from "../src/lib/theme.js";

describe("fuzzy matching", () => {
  it("matches a subsequence, not just a prefix", () => {
    expect(fuzzyMatch("Second Foundation", "sf")).toBeDefined();
    expect(fuzzyMatch("Second Foundation", "found")).toBeDefined();
    expect(fuzzyMatch("Second Foundation", "zzz")).toBeUndefined();
  });

  it("prefers word boundaries over mid-word hits", () => {
    const boundary = fuzzyMatch("Second Foundation", "sf");
    const midWord = fuzzyMatch("classification", "sf");
    if (!boundary || !midWord) throw new Error("both should match");
    expect(boundary.score).toBeGreaterThan(midWord.score);
  });

  it("reports the matched indices for highlighting", () => {
    expect(fuzzyMatch("population", "pop")?.indices).toEqual([0, 1, 2]);
  });

  it("ranks the best candidate first", () => {
    const sections = ["Outcomes", "Population", "Scenarios", "Questions"];
    const ranked = rankBy(sections, "pop", (value) => value);
    expect(ranked[0]?.item).toBe("Population");
  });

  it("keeps everything for an empty query", () => {
    expect(rankBy(["a", "b"], "", (value) => value)).toHaveLength(2);
  });
});

describe("predicate sniffing", () => {
  it.each([
    "age > 65",
    "tenure == social-rent",
    "sex == male && !degree",
    "region in [london, south-east]",
    "!registered",
  ])("treats %s as a predicate", (source) => {
    expect(looksLikePredicate(source)).toBe(true);
  });

  it.each(["stroud", "new scenario", "E14001479"])(
    "treats %s as navigation",
    (source) => {
      expect(looksLikePredicate(source)).toBe(false);
    },
  );
});

describe("theme preference", () => {
  it("defaults to dark", () => {
    expect(readStoredTheme(undefined)).toBe("dark");
    expect(readStoredTheme({ getItem: () => "nonsense" })).toBe("dark");
  });

  it("reads back what was stored", () => {
    const store = new Map<string, string>();
    storeTheme({ setItem: (k, v) => void store.set(k, v) }, "light");
    expect(store.get(THEME_STORAGE_KEY)).toBe("light");
    expect(readStoredTheme({ getItem: (k) => store.get(k) ?? null })).toBe(
      "light",
    );
  });

  it("survives a browser that refuses site data", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readStoredTheme(throwing)).toBe("dark");
    expect(() => storeTheme(throwing, "light")).not.toThrow();
  });

  it("resolves system against the machine, defaulting dark", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("validates the stored value", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
  });

  it("stamps the document root", () => {
    const root = { setAttribute: vi.fn() };
    applyTheme(root as unknown as Element, "light");
    expect(root.setAttribute).toHaveBeenCalledWith("data-theme", "light");
  });
});
