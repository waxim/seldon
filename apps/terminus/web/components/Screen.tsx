import { PageHeader, Tabs } from "@seldon/ui";
import type { ReactNode } from "react";
import { sectionById } from "../nav.js";

export interface ScreenProps {
  readonly sectionId: string;
  /** Which tab of the section is showing, when it has tabs. */
  readonly activeTab?: string;
  /** Defaults to the section's own label. */
  readonly title?: string;
  readonly lede?: ReactNode;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Every screen is a header, an optional tab rail, and a stack of panels. */
export function Screen({
  sectionId,
  activeTab,
  title,
  lede,
  meta,
  actions,
  children,
}: ScreenProps) {
  const section = sectionById(sectionId);
  return (
    <>
      <PageHeader
        title={title ?? section.label}
        lede={lede ?? section.summary}
        meta={meta}
        actions={actions}
      />
      {section.tabs && activeTab ? (
        <Tabs
          items={section.tabs}
          activeId={activeTab}
          label={`${section.label} views`}
        />
      ) : null}
      {children}
    </>
  );
}
