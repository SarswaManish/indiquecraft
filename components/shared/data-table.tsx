"use client";

import { cn } from "@/lib/utils";

interface Column<Row> {
  key: string;
  header: string;
  render?: (row: Row) => React.ReactNode;
  className?: string;
}

interface DataTableProps<Row extends { id?: string | number }> {
  columns: Column<Row>[];
  data: Row[];
  emptyMessage?: string;
  onRowClick?: (row: Row) => void;
  loading?: boolean;
  loadingRows?: number;
}

export function DataTable<Row extends { id?: string | number }>({
  columns,
  data,
  emptyMessage = "No records found",
  onRowClick,
  loading,
  loadingRows = 5,
}: DataTableProps<Row>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/90">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/90">
              {Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      <div className="h-4 w-full max-w-[10rem] animate-pulse rounded-full bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/90">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center"
              >
                <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Empty
                  </div>
                  <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
                  <p className="text-xs text-slate-400">
                    Try changing filters or add a new record to get started.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "text-sm transition-colors odd:bg-white even:bg-slate-50/35",
                  onRowClick && "cursor-pointer hover:bg-indigo-50/50"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-slate-700", col.className)}>
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, React.ReactNode>)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
