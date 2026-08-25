import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type ThemePreference,
} from "./theme.js";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Reads the stored preference, resolves "system" against the machine and
 * keeps `<html data-theme>` in step. Call `applyStoredTheme()` once before
 * React mounts so a light-theme user never sees a dark flash.
 */
export function applyStoredTheme(): ThemePreference {
  const preference = readStoredTheme(globalThis.localStorage);
  const prefersLight = globalThis.matchMedia?.(LIGHT_QUERY).matches ?? false;
  applyTheme(document.documentElement, resolveTheme(preference, prefersLight));
  return preference;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredTheme(globalThis.localStorage),
  );
  const [prefersLight, setPrefersLight] = useState(
    () => globalThis.matchMedia?.(LIGHT_QUERY).matches ?? false,
  );

  useEffect(() => {
    const query = globalThis.matchMedia?.(LIGHT_QUERY);
    if (!query) return;
    const listener = (event: MediaQueryListEvent) =>
      setPrefersLight(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const resolved = resolveTheme(preference, prefersLight);

  useEffect(() => {
    applyTheme(document.documentElement, resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    storeTheme(globalThis.localStorage, next);
    setPreferenceState(next);
  }, []);

  return { preference, resolved, setPreference } as const;
}
