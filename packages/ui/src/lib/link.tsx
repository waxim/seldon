import { createContext, type ReactNode, useContext, useMemo } from "react";

export interface LinkRenderProps {
  readonly href: string;
  readonly className?: string | undefined;
  readonly children: ReactNode;
  readonly "aria-current"?: "page" | undefined;
  readonly title?: string | undefined;
  readonly onClick?: (() => void) | undefined;
}

export type LinkRenderer = (props: LinkRenderProps) => ReactNode;

const defaultRenderer: LinkRenderer = ({ children, ...rest }) => (
  <a {...rest}>{children}</a>
);

const LinkContext = createContext<LinkRenderer>(defaultRenderer);

export interface NavigationProviderProps {
  /**
   * How this app turns an href into a link. Terminus hands in TanStack
   * Router's `Link`; tests and Storybook-ish contexts get a plain anchor.
   */
  readonly renderLink: LinkRenderer;
  readonly children: ReactNode;
}

/** Lets `@seldon/ui` stay router-agnostic while still navigating properly. */
export function NavigationProvider({
  renderLink,
  children,
}: NavigationProviderProps) {
  const value = useMemo(() => renderLink, [renderLink]);
  return <LinkContext.Provider value={value}>{children}</LinkContext.Provider>;
}

/** A link rendered by whatever the app registered. */
export function UiLink(props: LinkRenderProps) {
  const render = useContext(LinkContext);
  return <>{render(props)}</>;
}
