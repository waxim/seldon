import { Chip } from "./Chip.js";

/** The build phases of docs/13-roadmap.md, named so a screen cannot misname one. */
export const PHASES = {
  P0: "Streeling",
  P1: "Encyclopedia",
  P2: "Radiant",
  P3: "Psychohistory",
  P4: "Second Foundation",
  P5: "The Mule",
} as const;

export type Phase = keyof typeof PHASES;

export interface PhaseChipProps {
  readonly phase: Phase;
  /** The current phase wears the accent; everything ahead of it is quiet. */
  readonly current?: boolean;
}

/**
 * "P2 · Radiant". Every unbuilt surface says which phase fills it, so an
 * empty screen reads as a plan rather than a fault.
 */
export function PhaseChip({ phase, current = false }: PhaseChipProps) {
  return (
    <Chip
      tone={current ? "radiant" : "outline"}
      title={`Built in phase ${phase}: ${PHASES[phase]}`}
    >
      <span className="font-mono">{phase}</span>
      <span aria-hidden="true" className="opacity-40">
        ·
      </span>
      {PHASES[phase]}
    </Chip>
  );
}
