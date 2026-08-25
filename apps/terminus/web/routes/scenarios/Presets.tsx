import { Chip, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** The committed preset library, as docs/06-scenarios.md declares it. */
const PRESETS = [
  {
    id: "baseline",
    kind: "committed",
    contents:
      "The empty scenario; reproduces the epoch's baseline 2024 shares.",
  },
  {
    id: "current-polling",
    kind: "generated",
    contents:
      "National and regional targets from the poll-of-polls, timestamped and regenerated on every polling refresh.",
  },
  {
    id: "reform-surge",
    kind: "committed",
    contents:
      "National target, non-graduate lean rules, and Con→Reform transfers.",
  },
  {
    id: "youthquake",
    kind: "committed",
    contents: "Under-30s turnout rules and a lean to Labour and the Greens.",
  },
  {
    id: "progressive-alliance",
    kind: "committed",
    contents: "A Lab/LD/Green transfer lattice gated on marginality.",
  },
  {
    id: "blue-revival",
    kind: "committed",
    contents:
      "Con recovery: headwind reversal and shy-response-scale magnitudes.",
  },
];

export function ScenariosPresets() {
  return (
    <Screen
      sectionId="scenarios"
      activeTab="presets"
      lede="Presets are declared in Vault's codebase and published into D1 on deploy — one source of truth, so a preset in the console cannot drift from the one in the repository."
    >
      <Panel
        title="The preset library"
        subtitle="Declared today, publishable once Vault exists. None of these has been published, so none can be run."
      >
        <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2">
          {PRESETS.map((preset) => (
            <li
              key={preset.id}
              className="rounded-md border border-dashed border-hairline bg-ink/[0.025] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm text-ink">{preset.id}</code>
                <Chip
                  tone={preset.kind === "generated" ? "radiant" : "outline"}
                >
                  {preset.kind}
                </Chip>
              </div>
              <p className="mt-2 mb-3 text-sm text-ink-muted">
                {preset.contents}
              </p>
              <p className="m-0 font-mono text-xs text-ink-faint">
                — not published —
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </Screen>
  );
}
