"use client";

import { useEffect, useState } from "react";
import type { BrazeSnapshot } from "@/types/braze";
import CanvasTable from "@/components/CanvasTable";
import SegmentHealth from "@/components/SegmentHealth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import { LayoutGrid, Users, Send, DollarSign } from "lucide-react";

function KpiCards({ data }: { data: BrazeSnapshot }) {
  const totalEntries = data.canvases.reduce((s, c) => s + c.entries, 0);
  const totalMessages = data.canvases.reduce((s, c) => s + c.messagesSent, 0);
  const totalRevenue = data.canvases.reduce((s, c) => s + c.revenue, 0);

  const cards = [
    {
      title: "Active Canvases",
      value: formatNumber(data.canvases.length),
      subtitle: "tracked canvases",
      icon: LayoutGrid,
    },
    {
      title: "Total Entries (7d)",
      value: formatNumber(totalEntries),
      subtitle: "canvas entries this week",
      icon: Users,
    },
    {
      title: "Messages Sent",
      value: formatNumber(totalMessages),
      subtitle: "across all canvases",
      icon: Send,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      subtitle: "formatted currency",
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [data, setData] = useState<BrazeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/braze")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((json: BrazeSnapshot) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load data: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <KpiSkeleton />
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 py-6">
      {data.fetchedAt && (
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(data.fetchedAt).toLocaleString()}
        </p>
      )}
      <KpiCards data={data} />
      <CanvasTable data={data.canvases} />
      <SegmentHealth data={data.segments} />
    </div>
  );
}
