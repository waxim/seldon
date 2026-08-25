import type { ReactNode } from "react";

export interface PageHeaderProps {
  readonly title: string;
  readonly lede?: ReactNode;
  /** Section metadata — phase chips, counts, world scope. */
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
}

/** The top of every screen: what this is, and what state it is in. */
export function PageHeader({ title, lede, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-[76ch]">
        <h1 className="m-0 text-xl leading-tight font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {lede ? (
          <p className="mt-2 mb-0 text-sm text-ink-muted">{lede}</p>
        ) : null}
        {meta ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
