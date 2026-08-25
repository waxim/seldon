import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type ChipTone =
  | "neutral"
  | "radiant"
  | "positive"
  | "negative"
  | "outline";

export interface ChipProps {
  readonly tone?: ChipTone;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title?: string;
}

const TONE_CLASS: Record<ChipTone, string> = {
  neutral: "border-hairline bg-ink/[0.04] text-ink-muted",
  radiant: "border-radiant/40 bg-radiant/10 text-radiant",
  positive: "border-positive/40 bg-positive/10 text-positive",
  negative: "border-negative/40 bg-negative/10 text-negative",
  outline: "border-hairline-strong bg-transparent text-ink-muted",
};

/** A small, dense label. The console's unit of metadata. */
export function Chip({
  tone = "neutral",
  children,
  className,
  title,
}: ChipProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
