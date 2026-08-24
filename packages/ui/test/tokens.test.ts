import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COLOUR_TOKENS, colour, REFERENCE_PALETTE } from "../src/tokens.js";

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

  it("resolves a token to its custom property", () => {
    expect(colour("radiant")).toBe("var(--radiant)");
  });

  it("collapses motion under prefers-reduced-motion", () => {
    expect(css).toContain("prefers-reduced-motion");
  });
});
