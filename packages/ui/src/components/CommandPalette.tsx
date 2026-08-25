import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/cn.js";
import { rankBy } from "../lib/fuzzy.js";
import { looksLikePredicate } from "../lib/predicate.js";
import { useHotkey } from "../lib/useHotkey.js";
import { diagnose } from "./DslFilterBar.js";

const optionId = (id: string) => `seldon-palette-option-${id}`;

export interface PaletteCommand {
  readonly id: string;
  readonly label: string;
  /** "Go to", "Actions", "Filter" — the heading it sorts under. */
  readonly group: string;
  readonly hint?: string;
  /** Extra text the fuzzy matcher can see but the eye does not. */
  readonly keywords?: string;
  readonly href?: string;
  readonly onRun?: () => void;
}

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly commands: readonly PaletteCommand[];
  readonly worldId: string;
  readonly onNavigate: (href: string) => void;
  /** "Explore this filter" — hands a predicate to Population → Explore. */
  readonly onExplore: (predicate: string) => void;
}

/**
 * ⌘K: fuzzy navigation, verbs, and — because it embeds the `@seldon/dsl`
 * field registry — a predicate you type is offered straight to explore,
 * with its unknown fields already flagged (docs/09-terminus.md).
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  worldId,
  onNavigate,
  onExplore,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useHotkey("k", () => onOpenChange(!open), { meta: true });

  const predicate = looksLikePredicate(query);
  const diagnostics = useMemo(
    () => (predicate ? diagnose(worldId, query) : []),
    [predicate, worldId, query],
  );

  const results = useMemo(() => {
    const exploreCommand: PaletteCommand | undefined = predicate
      ? {
          id: "explore-predicate",
          label: `Explore this filter — ${query.trim()}`,
          group: "Filter",
          hint:
            diagnostics.length > 0
              ? `${diagnostics.length} unknown field${diagnostics.length > 1 ? "s" : ""}`
              : "Population → Explore",
        }
      : undefined;

    const matched =
      query.trim() === ""
        ? commands
        : rankBy(
            commands,
            query,
            (command) => `${command.label} ${command.keywords ?? ""}`,
          ).map((ranked) => ranked.item);

    return exploreCommand ? [exploreCommand, ...matched] : matched.slice(0, 24);
  }, [commands, query, predicate, diagnostics.length]);

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement;
    setQuery("");
    setHighlighted(0);
    input.current?.focus();
    return () => {
      const target = returnFocusTo.current;
      if (target instanceof HTMLElement) target.focus();
    };
  }, [open]);

  if (!open) return null;

  function run(command: PaletteCommand) {
    onOpenChange(false);
    if (command.id === "explore-predicate") {
      onExplore(query.trim());
      return;
    }
    if (command.onRun) command.onRun();
    else if (command.href) onNavigate(command.href);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted(
        (index) => (index + delta + results.length) % results.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = results[highlighted];
      if (command) run(command);
    }
  }

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      {/* A real button, so dismissing by pointer is also reachable by tab. */}
      <button
        type="button"
        aria-label="Close the command palette"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 cursor-default bg-void/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className={cn(
          "relative w-full max-w-[640px] overflow-hidden rounded-lg border border-hairline-strong bg-surface shadow-overlay",
          "motion-safe:animate-[seldon-rise_var(--motion-panel)_var(--ease-out-seldon)]",
        )}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <svg
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            aria-hidden="true"
            className="text-ink-faint"
          >
            <circle cx="7" cy="7" r="4.4" />
            <path d="m10.3 10.3 3 3" strokeLinecap="round" />
          </svg>
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="seldon-palette-results"
            aria-autocomplete="list"
            aria-activedescendant={
              results[highlighted]
                ? optionId(results[highlighted].id)
                : undefined
            }
            aria-label="Search or jump to"
            placeholder="Jump to a section, run a verb, or type a predicate…"
            spellCheck={false}
            autoComplete="off"
            className={cn(
              "w-full bg-transparent py-3.5 text-base text-ink outline-none",
              "placeholder:text-ink-faint",
              predicate && "font-mono text-sm",
            )}
          />
          <kbd className="rounded border border-hairline px-1.5 py-0.5 text-xs text-ink-faint">
            esc
          </kbd>
        </div>

        <div
          id="seldon-palette-results"
          role="listbox"
          aria-label="Results"
          className="max-h-[46vh] overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <p className="m-0 px-3 py-6 text-center text-sm text-ink-muted">
              Nothing matches “{query}”.
            </p>
          ) : (
            results.map((command, index) => {
              const heading = command.group !== lastGroup ? command.group : "";
              lastGroup = command.group;
              return (
                <div key={command.id}>
                  {heading ? (
                    <p className="mt-2 mb-1 px-2.5 text-xs tracking-[0.08em] text-ink-faint uppercase first:mt-0">
                      {heading}
                    </p>
                  ) : null}
                  {/* The listbox is driven from the input via
                      aria-activedescendant, so options are not tab stops. */}
                  <div
                    id={optionId(command.id)}
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === highlighted}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => run(command)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        run(command);
                      }
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                      index === highlighted
                        ? "bg-ink/[0.06] text-ink"
                        : "text-ink-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {command.label}
                    </span>
                    {command.hint ? (
                      <span className="shrink-0 text-xs text-ink-faint">
                        {command.hint}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {diagnostics.length > 0 ? (
          <div className="border-t border-hairline px-4 py-2.5">
            {diagnostics.map((diagnostic) => (
              <p
                key={`${diagnostic.line}:${diagnostic.column}`}
                className="m-0 font-mono text-xs text-negative"
              >
                {diagnostic.message}
                {diagnostic.suggestion
                  ? ` — did you mean ${diagnostic.suggestion}?`
                  : ""}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
