"use client";

import { useState, useMemo } from "react";
import SortableTable, { type Column } from "./SortableTable";
import Sparkline from "./Sparkline";
import { formatNumber, formatTrend } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { SegmentRow } from "@/types/braze";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

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
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const totalAudience = data.reduce((sum, s) => sum + s.currentSize, 0);
    const growing = data.filter((s) => s.trend7d > 2).length;
    const declining = data.filter((s) => s.trend7d < -2).length;
    const avgTrend =
      data.length > 0
        ? data.reduce((sum, s) => sum + s.trend7d, 0) / data.length
        : 0;
    return { totalAudience, growing, declining, avgTrend };
  }, [data]);

  const filtered = useMemo(
    () =>
      query
        ? data.filter((s) =>
            s.name.toLowerCase().includes(query.toLowerCase()),
          )
        : data,
    [data, query],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Health</CardTitle>
        <CardDescription>
          Audience segments with analytics tracking enabled
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary KPI cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            label="Total Audience"
            value={formatNumber(stats.totalAudience)}
          />
          <MiniStat
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
            label="Growing"
            value={String(stats.growing)}
            valueClassName="text-green-600"
          />
          <MiniStat
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            label="Declining"
            value={String(stats.declining)}
            valueClassName="text-red-600"
          />
          <MiniStat
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            label="Avg Trend"
            value={formatTrend(stats.avgTrend)}
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search segments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <SortableTable
          columns={columns}
          data={filtered}
          defaultSortKey="currentSize"
          defaultSortDir="desc"
        />
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${valueClassName ?? ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
