/**
 * The design tokens, in code. `tokens.css` declares them; this table is
 * what TypeScript surfaces (charts, inline styles, tests) so a colour
 * cannot be typed by hand into a component.
 */
export const COLOUR_TOKENS = [
  "void",
  "surface",
  "surface-raised",
  "surface-sunken",
  "ink",
  "ink-muted",
  "ink-faint",
  "radiant",
  "radiant-soft",
  "hairline",
  "hairline-strong",
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
  "surface-sunken": { dark: "#0D1220", light: "#EFEDE6" },
  ink: { dark: "#E9ECF5", light: "#171B26" },
  "ink-muted": { dark: "#9AA3B8", light: "#5A6172" },
  "ink-faint": { dark: "#7B8399", light: "#656B7A" },
  radiant: { dark: "#E3B34C", light: "#B78A2E" },
  "radiant-soft": { dark: "#6B5629", light: "#F0E2BD" },
  hairline: { dark: "#232C45", light: "#E3E1DA" },
  "hairline-strong": { dark: "#33406A", light: "#CBC8BD" },
  positive: { dark: "#4CC38A", light: "#2F8F63" },
  negative: { dark: "#E5484D", light: "#C2373B" },
};

/** Tokens that carry text and therefore owe WCAG 2.2 AA's 4.5:1. */
export const TEXT_TOKENS: readonly ColourToken[] = [
  "ink",
  "ink-muted",
  "ink-faint",
];

/** Tokens that render data marks, which owe 3:1. */
export const MARK_TOKENS: readonly ColourToken[] = [
  "radiant",
  "positive",
  "negative",
];

/** The three motion durations. Nothing bounces. */
export const MOTION = {
  fast: "var(--motion-fast)",
  panel: "var(--motion-panel)",
  camera: "var(--motion-camera)",
} as const;

/** The type scale, in px, as the doc states it. */
export const TYPE_SCALE = {
  xs: 13,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  display: 40,
} as const;

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#rrggbb` string, per WCAG 2.x. */
export function luminance(hex: string): number {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return (
    0.2126 * channel((value >> 16) & 0xff) +
    0.7152 * channel((value >> 8) & 0xff) +
    0.0722 * channel(value & 0xff)
  );
}

/** Contrast ratio between two `#rrggbb` strings. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}
