import { useEffect } from "react";

export interface HotkeyOptions {
  /** ⌘ on Apple, Ctrl elsewhere. */
  readonly meta?: boolean;
  readonly enabled?: boolean;
}

/** Bind a document-level shortcut for as long as the component is mounted. */
export function useHotkey(
  key: string,
  handler: () => void,
  { meta = false, enabled = true }: HotkeyOptions = {},
): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(event.metaKey || event.ctrlKey)) return;
      if (!meta && (event.metaKey || event.ctrlKey || event.altKey)) return;
      event.preventDefault();
      handler();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, handler, meta, enabled]);
}
