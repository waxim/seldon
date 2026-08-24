import type { HealthStatus } from "@seldon/foundation";

export interface StatusPillProps {
  readonly status: HealthStatus | "unknown";
  readonly label: string;
}

const TONE: Record<StatusPillProps["status"], string> = {
  ok: "positive",
  degraded: "radiant",
  failing: "negative",
  unknown: "ink-muted",
};

/** A health state, said plainly. Never a bare green dot with no label. */
export function StatusPill({ status, label }: StatusPillProps) {
  return (
    <span className="seldon-pill" data-tone={TONE[status]}>
      <span className="seldon-pill-dot" aria-hidden="true" />
      {label}
      <span className="seldon-pill-status">{status}</span>
    </span>
  );
}
