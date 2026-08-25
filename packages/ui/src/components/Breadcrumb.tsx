import { cn } from "../lib/cn.js";
import { UiLink } from "../lib/link.js";

export interface Crumb {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbProps {
  readonly items: readonly Crumb[];
  readonly label?: string;
  readonly className?: string;
}

/** The geography trail: England › South West › Stroud › Cainscross › street. */
export function Breadcrumb({
  items,
  label = "Breadcrumb",
  className,
}: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={cn("min-w-0", className)}>
      <ol className="m-0 flex flex-wrap items-center gap-1.5 p-0 text-xs">
        {items.map((crumb, index) => (
          <li key={crumb.label} className="flex list-none items-center gap-1.5">
            {index > 0 ? (
              <span aria-hidden="true" className="text-ink-faint/60">
                ›
              </span>
            ) : null}
            {crumb.href ? (
              <UiLink
                href={crumb.href}
                className="text-ink-muted no-underline hover:text-ink"
              >
                {crumb.label}
              </UiLink>
            ) : (
              <span
                className={
                  index === items.length - 1 ? "text-ink" : "text-ink-muted"
                }
              >
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
