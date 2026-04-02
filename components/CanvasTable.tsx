"use client";

import SortableTable, { type Column } from "./SortableTable";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import type { CanvasRow } from "@/types/braze";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const columns: Column<CanvasRow>[] = [
  {
    key: "name",
    label: "Canvas",
    render: (r) => <span className="font-medium">{r.name}</span>,
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
    <Card>
      <CardHeader>
        <CardTitle>Canvas Comparison</CardTitle>
        <CardDescription>
          Performance metrics across active canvases (last 7 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SortableTable
          columns={columns}
          data={data}
          defaultSortKey="entries"
          defaultSortDir="desc"
        />
      </CardContent>
    </Card>
  );
}
