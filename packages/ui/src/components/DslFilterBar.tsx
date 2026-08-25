import {
  type FieldDefinition,
  fieldRegistryFor,
  lintFields,
} from "@seldon/dsl";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/cn.js";
import { rankBy } from "../lib/fuzzy.js";

export interface DslDiagnostic {
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly suggestion?: string;
}

/** Run the field lint and flatten its errors into something renderable. */
export function diagnose(worldId: string, source: string): DslDiagnostic[] {
  if (source.trim() === "") return [];
  return lintFields(fieldRegistryFor(worldId), source).map((error) => {
    const details = (error.details ?? {}) as {
      position?: { line: number; column: number };
      suggestion?: string;
    };
    return {
      message: error.message,
      line: details.position?.line ?? 1,
      column: details.position?.column ?? 1,
      ...(details.suggestion ? { suggestion: details.suggestion } : {}),
    };
  });
}

/** The identifier being typed at the caret, if any. */
export function tokenAtCaret(
  source: string,
  caret: number,
): { token: string; start: number } | undefined {
  let start = caret;
  while (start > 0 && /[A-Za-z0-9_]/.test(source[start - 1] ?? "")) start -= 1;
  const token = source.slice(start, caret);
  return token.length > 0 ? { token, start } : undefined;
}

function describe(field: FieldDefinition): string {
  if (field.type === "enum") {
    const values = field.openSet
      ? "values from the spine"
      : field.values.join(" · ");
    return `enum — ${values}`;
  }
  if (field.type === "number") {
    const unit = field.unit ? ` ${field.unit}` : "";
    return `number${unit}`;
  }
  return field.sugarFor ? `boolean — sugar for ${field.sugarFor}` : "boolean";
}

export interface DslFilterBarProps {
  readonly worldId: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly placeholder?: string;
  /**
   * The live match count. Undefined means nobody can count yet — which is
   * said out loud rather than shown as a zero.
   */
  readonly matchCount?: { persons: number; share: number };
  readonly pendingNote?: ReactNode;
}

/**
 * The predicate bar: typed autocomplete from the field registry, inline
 * diagnostics squiggled at the offending token, and a live match count
 * (docs/09-terminus.md). The registry and the lint are real today; the
 * count needs a population to count, so it says so.
 */
export function DslFilterBar({
  worldId,
  value,
  onChange,
  onSubmit,
  placeholder = "age > 65 && tenure == social-rent",
  matchCount,
  pendingNote,
}: DslFilterBarProps) {
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [highlighted, setHighlighted] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const registry = useMemo(() => fieldRegistryFor(worldId), [worldId]);
  const diagnostics = useMemo(() => diagnose(worldId, value), [worldId, value]);

  const current = tokenAtCaret(value, caret);
  const suggestions = useMemo(() => {
    if (!current || dismissed) return [];
    const fields = [...registry.fields.values()];
    return rankBy(fields, current.token, (field) => field.name)
      .slice(0, 7)
      .map((ranked) => ranked.item);
  }, [current, dismissed, registry]);

  const open = suggestions.length > 0;

  function accept(field: FieldDefinition) {
    if (!current) return;
    const next =
      value.slice(0, current.start) +
      field.name +
      value.slice(current.start + current.token.length);
    onChange(next);
    setDismissed(true);
    requestAnimationFrame(() => {
      const position = current.start + field.name.length;
      input.current?.setSelectionRange(position, position);
      setCaret(position);
    });
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted(
        (index) => (index + delta + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (open && (event.key === "Tab" || event.key === "Enter")) {
      const field = suggestions[highlighted];
      if (field) {
        event.preventDefault();
        accept(field);
        return;
      }
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setDismissed(true);
      return;
    }
    if (event.key === "Enter") onSubmit?.(value);
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border bg-surface px-3 py-2",
          diagnostics.length > 0 ? "border-negative/60" : "border-hairline",
          "focus-within:border-radiant/70",
        )}
      >
        <span className="font-mono text-xs text-ink-faint select-none">
          where:
        </span>
        <input
          ref={input}
          value={value}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && suggestions[highlighted]
              ? `${listId}-${suggestions[highlighted].name}`
              : undefined
          }
          aria-label="Predicate filter"
          spellCheck={false}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(event) => {
            setDismissed(false);
            setHighlighted(0);
            setCaret(event.target.selectionStart ?? event.target.value.length);
            onChange(event.target.value);
          }}
          onSelect={(event) =>
            setCaret(event.currentTarget.selectionStart ?? 0)
          }
          onKeyDown={onKeyDown}
          className={cn(
            "min-w-48 flex-1 bg-transparent font-mono text-sm text-ink outline-none",
            "placeholder:text-ink-faint/70",
          )}
        />
        <span className="font-mono text-xs whitespace-nowrap text-ink-faint">
          {matchCount ? (
            <span className="text-radiant">
              {matchCount.persons.toLocaleString("en-GB")} persons ·{" "}
              {(matchCount.share * 100).toFixed(1)}%
            </span>
          ) : (
            "— no population to count —"
          )}
        </span>
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Fields"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-surface-raised p-1 shadow-overlay"
        >
          {suggestions.map((field, index) => (
            // Driven from the input via aria-activedescendant, so the
            // options themselves are not tab stops.
            <div
              key={field.name}
              id={`${listId}-${field.name}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault();
                accept(field);
              }}
              onMouseEnter={() => setHighlighted(index)}
              className={cn(
                "flex w-full cursor-pointer items-baseline gap-3 rounded px-2 py-1.5 text-left",
                index === highlighted ? "bg-ink/[0.06]" : "",
              )}
            >
              <span className="font-mono text-sm text-ink">{field.name}</span>
              <span className="truncate text-xs text-ink-faint">
                {describe(field)}
              </span>
              <span className="ml-auto text-xs text-ink-faint">
                {field.axis}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {diagnostics.length > 0 ? (
        <ul className="mt-2 list-none space-y-1 p-0">
          {diagnostics.map((diagnostic) => (
            <li
              key={`${diagnostic.line}:${diagnostic.column}:${diagnostic.message}`}
              className="font-mono text-xs text-negative"
            >
              <span className="text-ink-faint">
                {diagnostic.line}:{diagnostic.column}
              </span>{" "}
              {diagnostic.message}
              {diagnostic.suggestion ? (
                <>
                  {" — did you mean "}
                  <span className="text-radiant">{diagnostic.suggestion}</span>?
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {pendingNote ? (
        <p className="mt-2 mb-0 text-xs text-ink-faint">{pendingNote}</p>
      ) : null}
    </div>
  );
}
