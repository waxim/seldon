import { cn } from "../lib/cn.js";
import { UiLink } from "../lib/link.js";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  /** A count, when there is honestly one to show. */
  readonly count?: number;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly activeId: string;
  readonly label: string;
}

/** The within-section switcher. One level deep, never more. */
export function Tabs({ items, activeId, label }: TabsProps) {
  return (
    <nav aria-label={label} className="border-b border-hairline">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <UiLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm whitespace-nowrap no-underline",
                  "transition-colors duration-(--motion-fast) ease-(--ease-out-seldon)",
                  active
                    ? "border-radiant text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
                {typeof item.count === "number" ? (
                  <span className="rounded-full bg-ink/[0.06] px-1.5 text-xs text-ink-faint">
                    {item.count}
                  </span>
                ) : null}
              </UiLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
