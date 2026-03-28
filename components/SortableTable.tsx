"use client";

import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { SortDirection } from "@/types/braze";

export interface Column<T> {
  key: keyof T;
  label: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
}

interface SortableTableProps<T> {
  columns: Column<T>[];
  data: T[];
  defaultSortKey: keyof T;
  defaultSortDir?: SortDirection;
}

export default function SortableTable<T>({
  columns,
  data,
  defaultSortKey,
  defaultSortDir = "desc",
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  function handleSort(key: keyof T) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => handleSort(col.key)}
                className={clsx(
                  "cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 hover:text-gray-900 transition-colors",
                  col.numeric && "text-right"
                )}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className={clsx(
                "border-b border-gray-100 transition-colors hover:bg-gray-50",
                i % 2 === 1 && "bg-gray-50/50"
              )}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={clsx(
                    "px-4 py-3 tabular-nums",
                    col.numeric && "text-right"
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-400"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
