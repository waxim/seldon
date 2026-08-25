import type { HealthStatus } from "@seldon/foundation";
import { cn } from "../lib/cn.js";

export interface StatusPillProps {
  readonly status: HealthStatus | "unknown";
  readonly label: string;
}

const DOT: Record<StatusPillProps["status"], string> = {
  ok: "bg-positive",
  degraded: "bg-radiant",
  failing: "bg-negative",
  unknown: "bg-ink-faint",
};

/** A health state, said plainly. Never a bare green dot with no label. */
export function StatusPill({ status, label }: StatusPillProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs">
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", DOT[status])}
      />
      <span className="text-ink">{label}</span>
      <span className="text-ink-faint">{status}</span>
    </span>
  );
}
