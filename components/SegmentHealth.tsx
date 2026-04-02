"use client";

import SortableTable, { type Column } from "./SortableTable";
import Sparkline from "./Sparkline";
import { formatNumber, formatTrend } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import type { SegmentRow } from "@/types/braze";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function TrendBadge({ value }: { value: number }) {
  const variant =
    value > 10 ? "default" : value < -10 ? "destructive" : "secondary";
  return <Badge variant={variant}>{formatTrend(value)}</Badge>;
}

const columns: Column<SegmentRow>[] = [
  {
    key: "name",
    label: "Segment",
    render: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    key: "currentSize",
    label: "Current size",
    numeric: true,
    render: (r) => formatNumber(r.currentSize),
  },
  {
    key: "trend7d",
    label: "Trend (7d)",
    numeric: true,
    render: (r) => <TrendBadge value={r.trend7d} />,
  },
  {
    key: "sparklineData",
    label: "Sparkline",
    render: (r) => <Sparkline data={r.sparklineData} />,
  },
];

interface SegmentHealthProps {
  data: SegmentRow[];
}

export default function SegmentHealth({ data }: SegmentHealthProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Health</CardTitle>
        <CardDescription>
          Audience segments with analytics tracking enabled
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SortableTable
          columns={columns}
          data={data}
          defaultSortKey="currentSize"
          defaultSortDir="desc"
        />
      </CardContent>
    </Card>
  );
}
