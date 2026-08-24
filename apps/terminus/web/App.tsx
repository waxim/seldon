import { createClient, type WorldSummary } from "@seldon/client";
import type { HealthReport } from "@seldon/foundation";
import { AppShell, Panel, ProvenanceFooter, StatusPill } from "@seldon/ui";
import { useEffect, useState } from "react";

/**
 * The console shell (docs/09-terminus.md): eight sections, one level
 * deep, with the Overview standing in for the First Crisis until there is
 * a standing question to answer.
 *
 * P0 renders the walking skeleton — the browser calls `@seldon/client`,
 * the client calls Demerzel, Demerzel calls Radiant over RPC, and what
 * comes back is on screen. Every screen below is deliberately empty and
 * says which phase fills it.
 */
const NAV = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "population", label: "Population", href: "/population" },
  { id: "datasets", label: "Datasets", href: "/datasets" },
  { id: "scenarios", label: "Scenarios", href: "/scenarios" },
  { id: "questions", label: "Questions", href: "/questions" },
  { id: "runs", label: "Runs", href: "/runs" },
  { id: "outcomes", label: "Outcomes", href: "/outcomes" },
  { id: "second-foundation", label: "Second Foundation", href: "/second" },
] as const;

const PHASE_OF: Record<string, string> = {
  population: "P2 — Radiant",
  datasets: "P1 — Encyclopedia",
  scenarios: "P3 — Psychohistory",
  questions: "P3 — Psychohistory",
  runs: "P3 — Psychohistory",
  outcomes: "P3 — Psychohistory",
  "second-foundation": "P4 — Second Foundation",
};

const client = createClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

type Load<T> =
  | { state: "loading" }
  | { state: "ready"; value: T }
  | { state: "error"; message: string };

export function App() {
  const [activeId, setActiveId] = useState<string>("overview");
  const [health, setHealth] = useState<Load<HealthReport>>({
    state: "loading",
  });
  const [worlds, setWorlds] = useState<Load<WorldSummary[]>>({
    state: "loading",
  });

  useEffect(() => {
    let live = true;
    client
      .deepHealth()
      .then((value) => live && setHealth({ state: "ready", value }))
      .catch(
        (error: Error) =>
          live && setHealth({ state: "error", message: error.message }),
      );
    client.worlds
      .list()
      .then((value) => live && setWorlds({ state: "ready", value }))
      .catch(
        (error: Error) =>
          live && setWorlds({ state: "error", message: error.message }),
      );
    return () => {
      live = false;
    };
  }, []);

  const world =
    worlds.state === "ready" && worlds.value[0]
      ? worlds.value[0].name
      : "United Kingdom";

  return (
    <AppShell
      world={world}
      nav={NAV}
      activeId={activeId}
      onNavigate={(item) => setActiveId(item.id)}
      footer={
        <ProvenanceFooter
          entries={[
            { label: "phase", value: "P0 — Streeling" },
            {
              label: "gateway",
              value:
                health.state === "ready" ? health.value.version : health.state,
            },
            {
              label: "environment",
              value:
                health.state === "ready" ? health.value.environment : "unknown",
            },
          ]}
        />
      }
    >
      {activeId === "overview" ? (
        <Overview health={health} worlds={worlds} />
      ) : (
        <Panel
          title={NAV.find((item) => item.id === activeId)?.label ?? ""}
          subtitle={`Built in ${PHASE_OF[activeId] ?? "a later phase"}.`}
        >
          <p className="seldon-empty">
            Nothing here yet. The design for this screen is in the docs; this
            phase only proves the shell, the client and the gateway.
          </p>
        </Panel>
      )}
    </AppShell>
  );
}

function Overview({
  health,
  worlds,
}: {
  health: Load<HealthReport>;
  worlds: Load<WorldSummary[]>;
}) {
  return (
    <>
      <Panel
        title="The First Crisis"
        subtitle="The standing election question lives here from P3."
      >
        <p className="seldon-empty">
          No question has been asked yet, so there is no headline to show — and
          a headline invented for a demo would be exactly the kind of number
          this system exists to refuse.
        </p>
      </Panel>

      <Panel
        title="Walking skeleton"
        subtitle="Browser → @seldon/client → Demerzel → service RPC."
      >
        {health.state === "loading" ? (
          <p className="seldon-empty">Asking the gateway…</p>
        ) : health.state === "error" ? (
          <p className="seldon-error">Gateway unreachable: {health.message}</p>
        ) : (
          <ul className="seldon-checks">
            <li>
              <StatusPill status={health.value.status} label="demerzel" />
            </li>
            {(health.value.checks ?? []).map((check) => (
              <li key={check.name}>
                <StatusPill status={check.status} label={check.name} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Worlds" subtitle="Straight from Radiant, over RPC.">
        {worlds.state === "loading" ? (
          <p className="seldon-empty">Asking Radiant…</p>
        ) : worlds.state === "error" ? (
          <p className="seldon-error">{worlds.message}</p>
        ) : (
          <table className="seldon-table seldon-numeric">
            <thead>
              <tr>
                <th>World</th>
                <th>Seats</th>
                <th>Live epoch</th>
              </tr>
            </thead>
            <tbody>
              {worlds.value.map((entry) => (
                <tr key={entry.worldId}>
                  <td>{entry.name}</td>
                  <td>{entry.seatCount}</td>
                  <td>
                    <code>{entry.epochId ?? "none yet"}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
