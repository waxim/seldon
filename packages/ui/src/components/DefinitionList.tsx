import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface Definition {
  readonly term: string;
  readonly value: ReactNode;
  /** Mark a value that is not yet knowable, so it reads as pending. */
  readonly pending?: boolean;
}

export interface DefinitionListProps {
  readonly items: readonly Definition[];
  readonly columns?: 1 | 2 | 3;
  readonly className?: string;
}

/** Key/value facts — manifests, tuples, dossier attributes. */
export function DefinitionList({
  items,
  columns = 2,
  className,
}: DefinitionListProps) {
  return (
    <dl
      className={cn(
        "m-0 grid gap-x-6 gap-y-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.term} className="min-w-0">
          <dt className="text-xs tracking-[0.06em] text-ink-faint uppercase">
            {item.term}
          </dt>
          <dd
            className={cn(
              "m-0 mt-1 text-sm break-words",
              item.pending ? "text-ink-faint italic" : "text-ink",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
