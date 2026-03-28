"use client";

import SortableTable, { type Column } from "./SortableTable";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import type { CanvasRow } from "@/types/braze";

const columns: Column<CanvasRow>[] = [
  {
    key: "name",
    label: "Canvas",
    render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
  },
  {
    key: "entries",
    label: "Entries (7d)",
    numeric: true,
    render: (r) => formatNumber(r.entries),
  },
  {
    key: "messagesSent",
    label: "Messages sent",
    numeric: true,
    render: (r) => formatNumber(r.messagesSent),
  },
  {
    key: "conversions",
    label: "Conversions",
    numeric: true,
    render: (r) => formatNumber(r.conversions),
  },
  {
    key: "revenue",
    label: "Revenue",
    numeric: true,
    render: (r) => formatCurrency(r.revenue),
  },
];

interface CanvasTableProps {
  data: CanvasRow[];
}

export default function CanvasTable({ data }: CanvasTableProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        Canvas Comparison
      </h2>
      <SortableTable
        columns={columns}
        data={data}
        defaultSortKey="entries"
        defaultSortDir="desc"
      />
    </section>
  );
}
