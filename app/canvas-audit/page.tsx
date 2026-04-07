"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CanvasAuditListResponse } from "@/types/canvas-audit";
import HealthScoreBadge from "@/components/canvas-audit/HealthScoreBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, ArrowRight } from "lucide-react";

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function CanvasAuditListPage() {
  const [data, setData] = useState<CanvasAuditListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditingId, setAuditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/canvas-audit")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((json: CanvasAuditListResponse) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function runAudit(canvasId: string) {
    setAuditingId(canvasId);
    try {
      const res = await fetch(`/api/canvas-audit/${canvasId}`);
      if (!res.ok) throw new Error(`Audit failed: ${res.status}`);
      const result = await res.json();
      // Update the health score in the list
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          canvases: prev.canvases.map((c) =>
            c.id === canvasId
              ? { ...c, healthScore: result.healthScore }
              : c
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setAuditingId(null);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="size-6" />
        <div>
          <h1 className="text-2xl font-bold">Canvas Audit</h1>
          <p className="text-sm text-muted-foreground">
            Automated health check for your Braze canvases
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canvases</CardTitle>
          <CardDescription>
            Click &quot;Run Audit&quot; to analyze a canvas, or view existing results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ListSkeleton />
          ) : !data?.canvases?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              No canvases found
            </p>
          ) : (
            <div className="space-y-2">
              {data.canvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <HealthScoreBadge score={canvas.healthScore} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{canvas.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {canvas.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {canvas.lastEdited && (
                        <span className="text-xs text-muted-foreground">
                          edited{" "}
                          {new Date(canvas.lastEdited).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runAudit(canvas.id)}
                      disabled={auditingId === canvas.id}
                    >
                      {auditingId === canvas.id
                        ? "Auditing..."
                        : canvas.healthScore >= 0
                          ? "Re-audit"
                          : "Run Audit"}
                    </Button>
                    {canvas.healthScore >= 0 && (
                      <Link href={`/canvas-audit/${canvas.id}`}>
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data?.fetchedAt && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(data.fetchedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
