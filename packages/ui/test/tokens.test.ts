import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COLOUR_TOKENS,
  colour,
  contrastRatio,
  MARK_TOKENS,
  REFERENCE_PALETTE,
  TEXT_TOKENS,
} from "../src/tokens.js";

const css = readFileSync(
  fileURLToPath(new URL("../src/tokens.css", import.meta.url)),
  "utf8",
);

describe("design tokens", () => {
  it("declares every colour token in CSS, in both themes", () => {
    for (const token of COLOUR_TOKENS) {
      expect(css, token).toContain(`--${token}:`);
      const light = css.slice(css.indexOf('[data-theme="light"]'));
      expect(light, token).toContain(`--${token}:`);
    }
  });

  it("matches the reference palette values", () => {
    for (const token of COLOUR_TOKENS) {
      const value = REFERENCE_PALETTE[token].dark.toLowerCase();
      expect(css).toContain(`--${token}: ${value}`);
    }
  });

  it("keeps the nine tokens the design doc names at the doc's values", () => {
    // docs/09-terminus.md's table is the contract; these must not drift.
    expect(REFERENCE_PALETTE.void).toEqual({
      dark: "#0A0E1A",
      light: "#F7F6F2",
    });
    expect(REFERENCE_PALETTE.radiant).toEqual({
      dark: "#E3B34C",
      light: "#B78A2E",
    });
    expect(REFERENCE_PALETTE.ink.dark).toBe("#E9ECF5");
    expect(REFERENCE_PALETTE["ink-muted"].dark).toBe("#9AA3B8");
    expect(REFERENCE_PALETTE.hairline.dark).toBe("#232C45");
    expect(REFERENCE_PALETTE.positive.dark).toBe("#4CC38A");
    expect(REFERENCE_PALETTE.negative.dark).toBe("#E5484D");
  });

  it("resolves a token to its custom property", () => {
    expect(colour("radiant")).toBe("var(--radiant)");
  });

  it("collapses motion under prefers-reduced-motion", () => {
    expect(css).toContain("prefers-reduced-motion");
  });
});

describe("contrast, as an acceptance criterion", () => {
  // "the dark palette holds >= 4.5:1 for text and >= 3:1 for data marks"
  // — docs/09-terminus.md, accessibility.
  const dark = REFERENCE_PALETTE.void.dark;

  it.each(TEXT_TOKENS)("%s carries text on --void at 4.5:1", (token) => {
    expect(
      contrastRatio(REFERENCE_PALETTE[token].dark, dark),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(MARK_TOKENS)("%s draws a mark on --void at 3:1", (token) => {
    expect(
      contrastRatio(REFERENCE_PALETTE[token].dark, dark),
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(TEXT_TOKENS)("%s carries text in the light theme too", (token) => {
    expect(
      contrastRatio(
        REFERENCE_PALETTE[token].light,
        REFERENCE_PALETTE.void.light,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("computes a known ratio", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });
});
