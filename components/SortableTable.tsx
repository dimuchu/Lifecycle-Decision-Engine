"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/types/braze";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={String(col.key)}
              onClick={() => handleSort(col.key)}
              className={cn(
                "cursor-pointer select-none transition-colors hover:text-foreground",
                col.numeric && "text-right"
              )}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {sortKey === col.key ? (
                  sortDir === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )
                ) : (
                  <ArrowUpDown className="size-3 opacity-30" />
                )}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col) => (
              <TableCell
                key={String(col.key)}
                className={cn(
                  "tabular-nums",
                  col.numeric && "text-right"
                )}
              >
                {col.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {sorted.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-muted-foreground"
            >
              No data available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
