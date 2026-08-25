import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { UiLink } from "../lib/link.js";
import { RadiantMark } from "./RadiantMark.js";
import { SectionIcon } from "./SectionIcon.js";
import { ThemeToggle } from "./ThemeToggle.js";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface WorldOption {
  readonly id: string;
  readonly name: string;
}

export interface AppShellProps {
  readonly nav: readonly NavItem[];
  readonly activeId: string;
  readonly worlds: readonly WorldOption[];
  readonly worldId: string;
  readonly onSelectWorld?: (worldId: string) => void;
  /** Opens ⌘K. The shell only renders the trigger; the palette is separate. */
  readonly onOpenPalette?: () => void;
  /** Environment, build, gateway health — the quiet strip under the nav. */
  readonly status?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The console frame: a fixed, shallow left nav of eight sections one level
 * deep, a world switcher that re-scopes every screen, and a content well
 * (docs/09-terminus.md). Below `lg` the nav becomes a horizontal rail so
 * the whole console reflows at 400% zoom rather than clipping.
 */
export function AppShell({
  nav,
  activeId,
  worlds,
  worldId,
  onSelectWorld,
  onOpenPalette,
  status,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-void">
      <a
        href="#main"
        className="skip-link rounded-md border border-radiant bg-surface px-3 py-2 text-sm text-ink no-underline"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface/85 px-4 backdrop-blur-md">
        <UiLink
          href="/"
          className="flex items-center gap-2 no-underline"
          title="Terminus — the Seldon console"
        >
          <RadiantMark size={22} />
          <span className="text-sm font-semibold tracking-[0.14em] text-ink uppercase">
            Terminus
          </span>
        </UiLink>

        <span aria-hidden="true" className="h-5 w-px bg-hairline" />

        <label className="relative flex items-center">
          <span className="sr-only">World</span>
          <select
            value={worldId}
            onChange={(event) => onSelectWorld?.(event.target.value)}
            className={cn(
              "appearance-none rounded-md border border-hairline bg-surface-raised py-1 pr-7 pl-2.5 text-sm text-ink",
              "hover:border-hairline-strong",
            )}
          >
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.name}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            className="pointer-events-none absolute right-2 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="m4 6.5 4 4 4-4" />
          </svg>
        </label>

        <div className="flex-1" />

        {onOpenPalette ? (
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search or jump to"
            className={cn(
              "flex items-center gap-2 rounded-md border border-hairline bg-surface-raised px-2 py-1.5 text-sm text-ink-faint sm:px-3",
              "transition-colors duration-(--motion-fast) hover:border-hairline-strong hover:text-ink-muted",
            )}
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.4" />
              <path d="m10.3 10.3 3 3" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Search or jump to…</span>
            <kbd className="ml-6 hidden rounded border border-hairline px-1.5 py-0.5 text-xs sm:inline">
              ⌘K
            </kbd>
          </button>
        ) : null}

        <ThemeToggle />
      </header>

      <div className="lg:grid lg:grid-cols-[236px_1fr] lg:items-start">
        <nav
          aria-label="Sections"
          className={cn(
            "border-b border-hairline bg-surface/40 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:border-r lg:border-b-0",
            "lg:flex lg:flex-col",
          )}
        >
          <ul className="m-0 flex list-none gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:p-3">
            {nav.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id}>
                  <UiLink
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap no-underline",
                      "transition-colors duration-(--motion-fast) ease-(--ease-out-seldon)",
                      active
                        ? "bg-surface-raised text-ink shadow-[inset_2px_0_0_var(--radiant)]"
                        : "text-ink-muted hover:bg-ink/[0.035] hover:text-ink",
                    )}
                  >
                    <span
                      className={active ? "text-radiant" : "text-ink-faint"}
                    >
                      <SectionIcon id={item.id} />
                    </span>
                    {item.label}
                  </UiLink>
                </li>
              );
            })}
          </ul>
          {status ? (
            <div className="hidden border-t border-hairline p-3 lg:block">
              {status}
            </div>
          ) : null}
        </nav>

        <main
          id="main"
          tabIndex={-1}
          className="min-w-0 px-4 py-6 focus-visible:outline-none sm:px-6 lg:min-h-[calc(100vh-3.5rem)]"
        >
          <div className="mx-auto flex min-h-full max-w-[1180px] flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
