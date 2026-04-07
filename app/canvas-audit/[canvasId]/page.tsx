"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { CanvasAuditResult } from "@/types/canvas-audit";
import HealthScoreBadge from "@/components/canvas-audit/HealthScoreBadge";
import DimensionScoreCard from "@/components/canvas-audit/DimensionScoreCard";
import FindingsList from "@/components/canvas-audit/FindingsList";
import StepDropoffChart from "@/components/canvas-audit/StepDropoffChart";
import VariantComparisonTable from "@/components/canvas-audit/VariantComparisonTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

export default function CanvasAuditDetailPage() {
  const params = useParams<{ canvasId: string }>();
  const [data, setData] = useState<CanvasAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.canvasId) return;
    fetch(`/api/canvas-audit/${params.canvasId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((json: CanvasAuditResult) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.canvasId]);

  if (error) {
    return (
      <div className="space-y-4 py-6">
        <Link href="/canvas-audit">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 size-4" /> Back to list
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load audit: {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-8 w-24" />
        <DetailSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const canvas = data.normalizedCanvas;

  return (
    <div className="space-y-6 py-6">
      {/* Navigation */}
      <Link href="/canvas-audit">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 size-4" /> Back to list
        </Button>
      </Link>

      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{data.canvasName}</h1>
            {canvas.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {canvas.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canvas.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground">
                {canvas.scheduleType} &middot; {canvas.steps.length} steps
                &middot; {canvas.variants.length} variant
                {canvas.variants.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <HealthScoreBadge score={data.healthScore} size="lg" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniStat
              label="Entries"
              value={canvas.totalEntries.toLocaleString()}
            />
            <MiniStat
              label="Conversions"
              value={canvas.totalConversions.toLocaleString()}
            />
            <MiniStat
              label="Conv. Rate"
              value={`${(data.derivedMetrics.overallConversionRate * 100).toFixed(2)}%`}
            />
            <MiniStat
              label="Rev/Entry"
              value={formatCurrency(
                data.derivedMetrics.overallRevenuePerEntry
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dimension Scores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {data.dimensions.map((dim) => (
          <DimensionScoreCard key={dim.dimension} dimension={dim} />
        ))}
      </div>

      {/* Findings */}
      <FindingsList findings={data.findings} />

      {/* Step Drop-off Chart */}
      <StepDropoffChart dropoffs={data.derivedMetrics.stepDropoffs} />

      {/* Variant Comparison Table */}
      <VariantComparisonTable
        variants={data.derivedMetrics.variantComparisons}
      />

      {/* Audit metadata */}
      <p className="text-xs text-muted-foreground">
        Audited at: {new Date(data.auditedAt).toLocaleString()}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
