import { partiesFor } from "@seldon/parties";
import {
  AppShell,
  Chip,
  CommandPalette,
  type LinkRenderer,
  NavigationProvider,
  type PaletteCommand,
  StatusPill,
} from "@seldon/ui";
import { useQuery } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { healthQuery, worldsQuery } from "../lib/api.js";
import { NAV_ITEMS, SECTIONS, sectionIdForPath, VERBS } from "../nav.js";

const renderLink: LinkRenderer = ({ href, children, ...rest }) => (
  <Link to={href} {...rest}>
    {children}
  </Link>
);

/**
 * The console frame, shared by every screen: nav, world switcher, ⌘K and
 * the quiet status strip that says which environment you are looking at.
 */
export function Root() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const health = useQuery(healthQuery);
  const worlds = useQuery(worldsQuery);

  const worldOptions = useMemo(() => {
    const known = (worlds.data ?? []).map((world) => ({
      id: world.worldId,
      name: world.name,
    }));
    return known.length > 0 ? known : [{ id: "uk", name: "United Kingdom" }];
  }, [worlds.data]);

  const worldId = worldOptions[0]?.id ?? "uk";

  const commands = useMemo<PaletteCommand[]>(() => {
    const sections = SECTIONS.flatMap((section) => [
      {
        id: `section:${section.id}`,
        label: section.label,
        group: "Go to",
        hint: section.phase,
        keywords: section.summary,
        href: section.href,
      },
      ...(section.tabs ?? [])
        .filter((tab) => tab.href !== section.href)
        .map((tab) => ({
          id: `tab:${section.id}:${tab.id}`,
          label: `${section.label} › ${tab.label}`,
          group: "Go to",
          keywords: section.summary,
          href: tab.href,
        })),
    ]);

    const verbs = VERBS.map((verb) => ({
      id: `verb:${verb.id}`,
      label: verb.label,
      group: "Actions",
      hint: verb.phase,
      href: verb.href,
    }));

    const parties = partiesFor(worldId).map((party) => ({
      id: `party:${party.code}`,
      label: party.name,
      group: "Parties",
      hint: party.code,
      keywords: party.aliases.join(" "),
      href: "/",
    }));

    return [...sections, ...verbs, ...parties];
  }, [worldId]);

  const go = useCallback(
    (href: string) => {
      void navigate({ to: href });
    },
    [navigate],
  );

  return (
    <NavigationProvider renderLink={renderLink}>
      <AppShell
        nav={NAV_ITEMS}
        activeId={sectionIdForPath(pathname)}
        worlds={worldOptions}
        worldId={worldId}
        onOpenPalette={() => setPaletteOpen(true)}
        status={
          <div className="space-y-2">
            <StatusPill
              status={health.data?.status ?? "unknown"}
              label="gateway"
            />
            <div className="flex flex-wrap gap-1.5">
              <Chip tone="outline">
                {health.data?.environment ?? "environment unknown"}
              </Chip>
              <Chip tone="outline">P0 · Streeling</Chip>
            </div>
            <p className="m-0 text-xs text-ink-faint">
              Every screen says which phase fills it. None of them invents a
              number to fill the gap.
            </p>
          </div>
        }
      >
        <Outlet />
      </AppShell>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        worldId={worldId}
        onNavigate={go}
        onExplore={(predicate) => {
          void navigate({
            to: "/population/explore",
            search: { where: predicate },
          });
        }}
      />
    </NavigationProvider>
  );
}
