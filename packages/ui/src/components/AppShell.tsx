import type { ReactNode } from "react";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface AppShellProps {
  /** Shown above the nav; the world switcher lives here later. */
  readonly world: string;
  readonly nav: readonly NavItem[];
  readonly activeId: string;
  readonly onNavigate?: (item: NavItem) => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * The console frame: fixed, shallow left nav (eight sections, one level
 * deep) and a content well (docs/09-terminus.md).
 */
export function AppShell({
  world,
  nav,
  activeId,
  onNavigate,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="seldon-shell">
      <nav className="seldon-nav" aria-label="Sections">
        <div className="seldon-world">
          <span className="seldon-world-label">World</span>
          <span className="seldon-world-name">{world}</span>
        </div>
        <ul>
          {nav.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                aria-current={item.id === activeId ? "page" : undefined}
                onClick={
                  onNavigate
                    ? (event) => {
                        event.preventDefault();
                        onNavigate(item);
                      }
                    : undefined
                }
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="seldon-main">
        {children}
        {footer ? <div className="seldon-footer">{footer}</div> : null}
      </main>
    </div>
  );
}
