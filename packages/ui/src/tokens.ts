/**
 * The design tokens, in code. `tokens.css` declares them; this table is
 * what TypeScript surfaces (charts, inline styles, tests) so a colour
 * cannot be typed by hand into a component.
 */
export const COLOUR_TOKENS = [
  "void",
  "surface",
  "surface-raised",
  "ink",
  "ink-muted",
  "radiant",
  "hairline",
  "positive",
  "negative",
] as const;

export type ColourToken = (typeof COLOUR_TOKENS)[number];

/** `colour("radiant")` → `var(--radiant)`. */
export function colour(token: ColourToken): string {
  return `var(--${token})`;
}

export const REFERENCE_PALETTE: Record<
  ColourToken,
  { dark: string; light: string }
> = {
  void: { dark: "#0A0E1A", light: "#F7F6F2" },
  surface: { dark: "#111726", light: "#FFFFFF" },
  "surface-raised": { dark: "#18203A", light: "#FFFFFF" },
  ink: { dark: "#E9ECF5", light: "#171B26" },
  "ink-muted": { dark: "#9AA3B8", light: "#5A6172" },
  radiant: { dark: "#E3B34C", light: "#B78A2E" },
  hairline: { dark: "#232C45", light: "#E3E1DA" },
  positive: { dark: "#4CC38A", light: "#2F8F63" },
  negative: { dark: "#E5484D", light: "#C2373B" },
};

/** The three motion durations. Nothing bounces. */
export const MOTION = {
  fast: "var(--motion-fast)",
  panel: "var(--motion-panel)",
  camera: "var(--motion-camera)",
} as const;
