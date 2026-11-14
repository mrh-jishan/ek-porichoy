import type { ReactNode } from "react";
import { cn } from "../cn";
import { EmptyState } from "./layout";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Generic, server-renderable table. Every list in every portal uses this. */
export function DataTable<T>({ columns, rows, rowKey, empty, className }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode; className?: string;
}) {
  if (rows.length === 0) return <EmptyState title={empty ?? "-"} className="m-5" />;
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/70">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-brand-50/40">
              {columns.map((c) => <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>{c.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
