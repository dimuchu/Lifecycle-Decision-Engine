"use client";

import type { DimensionScore } from "@/types/canvas-audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DIMENSION_LABELS: Record<string, string> = {
  goal: "Goal",
  structure: "Structure",
  performance: "Performance",
  experimentation: "Experimentation",
  measurement: "Measurement",
};

interface DimensionScoreCardProps {
  dimension: DimensionScore;
}

export default function DimensionScoreCard({
  dimension,
}: DimensionScoreCardProps) {
  const barColor =
    dimension.score >= 70
      ? "bg-green-500"
      : dimension.score >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  const findingsCount = dimension.findings.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {DIMENSION_LABELS[dimension.dimension] ?? dimension.dimension}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tabular-nums">
            {dimension.score}
          </div>
          <div className="flex-1">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={cn("h-2 rounded-full transition-all", barColor)}
                style={{ width: `${dimension.score}%` }}
              />
            </div>
          </div>
        </div>
        {findingsCount > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {findingsCount} finding{findingsCount !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
