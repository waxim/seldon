import type { ReactNode } from "react";

export interface PanelProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** A titled surface. The unit every screen is assembled from. */
export function Panel({ title, subtitle, actions, children }: PanelProps) {
  return (
    <section className="seldon-panel">
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="seldon-panel-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="seldon-panel-actions">{actions}</div> : null}
      </header>
      <div className="seldon-panel-body">{children}</div>
    </section>
  );
}
