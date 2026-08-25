/**
 * Theme state. Dark by default with a supported light theme
 * (docs/09-terminus.md) — and "system", because a console someone lives
 * in all day should follow the machine if that is what they asked for.
 *
 * The DOM contract is a single `data-theme` attribute on `<html>`;
 * `tokens.css` does the rest.
 */
export const THEMES = ["dark", "light", "system"] as const;
export type ThemePreference = (typeof THEMES)[number];
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "seldon.theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" && (THEMES as readonly string[]).includes(value)
  );
}

/** What "system" means right now. Defaults to dark when nothing says. */
export function resolveTheme(
  preference: ThemePreference,
  prefersLight = false,
): ResolvedTheme {
  if (preference !== "system") return preference;
  return prefersLight ? "light" : "dark";
}

export function readStoredTheme(
  storage: Pick<Storage, "getItem"> | undefined,
): ThemePreference {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "dark";
  } catch {
    // A browser refusing site data is not a reason to fail to render.
    return "dark";
  }
}

export function storeTheme(
  storage: Pick<Storage, "setItem"> | undefined,
  preference: ThemePreference,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore: the preference simply will not survive the session.
  }
}

/** Stamp the resolved theme onto the document root. */
export function applyTheme(root: Element, theme: ResolvedTheme): void {
  root.setAttribute("data-theme", theme);
}
