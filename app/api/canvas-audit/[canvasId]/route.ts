import { NextResponse } from "next/server";
import {
  getCanvasDetails,
  getCanvasDataSummaryFull,
  getCanvasDataSeries,
} from "@/lib/braze";
import { getFromCache, setInCache } from "@/lib/cache";
import { buildNormalizedCanvas } from "@/lib/canvas-audit/normalize";
import { runAudit } from "@/lib/canvas-audit/engine";
import type { CanvasAuditResult } from "@/types/canvas-audit";

export const dynamic = "force-dynamic";

const AUDIT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const { canvasId } = await params;

  if (!canvasId) {
    return NextResponse.json({ error: "Missing canvasId" }, { status: 400 });
  }

  const cacheKey = `canvas_audit_${canvasId}`;
  const cached = getFromCache<CanvasAuditResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const [detailsResult, summaryResult, seriesResult] =
      await Promise.allSettled([
        getCanvasDetails(canvasId),
        getCanvasDataSummaryFull(canvasId, 14),
        getCanvasDataSeries(canvasId, 14),
      ]);

    if (detailsResult.status === "rejected") {
      return NextResponse.json(
        { error: `Failed to fetch canvas details: ${detailsResult.reason}` },
        { status: 502 }
      );
    }

    const details = detailsResult.value;
    const summary =
      summaryResult.status === "fulfilled"
        ? summaryResult.value
        : { data: undefined };
    const series =
      seriesResult.status === "fulfilled"
        ? seriesResult.value
        : { data: undefined };

    const normalized = buildNormalizedCanvas(
      canvasId,
      details,
      summary,
      series
    );
    const result = runAudit(normalized);

    setInCache(cacheKey, result, AUDIT_TTL_MS);

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
