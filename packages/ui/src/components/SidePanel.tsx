import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "./Button.js";

export interface SidePanelProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * The dossier panel: it slides in from the right and is never a modal —
 * the map stays live behind it for orientation. Focus is trapped while it
 * is open, Esc closes it, and focus returns to whatever opened it
 * (docs/09-terminus.md, accessibility).
 */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: SidePanelProps) {
  const panel = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const trap = useCallback((event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const node = panel.current;
    if (!node) return;
    const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      trap(event);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const target = returnFocusTo.current;
      if (target instanceof HTMLElement) target.focus();
    };
  }, [open, onClose, trap]);

  if (!open) return null;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={title}
      className={cn(
        "flex h-full w-full flex-col border-l border-hairline bg-surface shadow-overlay",
        "motion-safe:animate-[seldon-slide-in_var(--motion-panel)_var(--ease-out-seldon)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h2 className="m-0 truncate text-base font-semibold text-ink">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 mb-0 text-xs text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close panel">
          <span aria-hidden="true">✕</span>
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <footer className="border-t border-hairline px-5 py-3">{footer}</footer>
      ) : null}
    </div>
  );
}
