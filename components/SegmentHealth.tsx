"use client";

import SortableTable, { type Column } from "./SortableTable";
import Sparkline from "./Sparkline";
import { formatNumber, formatTrend } from "@/lib/formatters";
import clsx from "clsx";
import type { SegmentRow } from "@/types/braze";

function TrendBadge({ value }: { value: number }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        value > 10 && "bg-green-100 text-green-700",
        value < -10 && "bg-red-100 text-red-700",
        value >= -10 && value <= 10 && "bg-yellow-100 text-yellow-700"
      )}
    >
      {formatTrend(value)}
    </span>
  );
}

const columns: Column<SegmentRow>[] = [
  {
    key: "name",
    label: "Segment",
    render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
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
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        Segment Health
      </h2>
      <SortableTable
        columns={columns}
        data={data}
        defaultSortKey="currentSize"
        defaultSortDir="desc"
      />
    </section>
  );
}
