import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface Column<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: T) => ReactNode;
  readonly numeric?: boolean;
  readonly width?: string;
}

export interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  /** Shown in place of the body when there is nothing — never a blank void. */
  readonly empty: ReactNode;
  /** Screen-reader caption; also the export filename hint. */
  readonly caption: string;
}

/**
 * The table. It renders its head even with no rows, because the columns
 * are the promise: you can see what the data will be before it lands.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  "border-b border-hairline px-4 py-2.5 text-xs font-medium tracking-[0.06em] text-ink-faint uppercase",
                  column.numeric ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-ink-muted"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors duration-(--motion-fast) hover:bg-ink/[0.035]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-b border-hairline px-4 py-2.5 text-ink",
                      column.numeric ? "text-right tabular-nums" : "text-left",
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
