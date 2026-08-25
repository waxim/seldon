import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type NoteTone = "neutral" | "radiant" | "negative";

export interface NoteProps {
  readonly tone?: NoteTone;
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

const TONE: Record<NoteTone, string> = {
  neutral: "border-hairline bg-ink/[0.025] text-ink-muted",
  radiant: "border-radiant/35 bg-radiant/[0.07] text-ink-muted",
  negative: "border-negative/40 bg-negative/[0.07] text-ink-muted",
};

/** A standing caveat, stated in place rather than hidden in a footnote. */
export function Note({
  tone = "neutral",
  title,
  children,
  className,
}: NoteProps) {
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        TONE[tone],
        className,
      )}
    >
      {title ? <p className="m-0 mb-1 font-medium text-ink">{title}</p> : null}
      <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
