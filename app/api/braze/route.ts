import { NextResponse } from "next/server";
import {
  getCanvasList,
  getCanvasDataSummary,
  getSegmentList,
  getSegmentDataSeries,
} from "@/lib/braze";
import { getFromCache, setInCache } from "@/lib/cache";
import type { BrazeSnapshot, CanvasRow, SegmentRow } from "@/types/braze";

const CACHE_KEY = "braze_snapshot";
const MAX_CANVASES = 20;
const MAX_SEGMENTS = 20;

export async function GET() {
  // Check cache first
  const cached = getFromCache<BrazeSnapshot>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    // Step 1: Fetch lists in parallel (graceful fallback on 403)
    const [canvasResult, segmentResult] = await Promise.allSettled([
      getCanvasList(0),
      getSegmentList(0),
    ]);

    const allCanvases =
      canvasResult.status === "fulfilled" ? canvasResult.value : [];
    const allSegments =
      segmentResult.status === "fulfilled" ? segmentResult.value : [];

    // Step 2: Filter segments with analytics tracking
    const trackableSegments = allSegments.filter(
      (s) => s.analytics_tracking_enabled
    );

    // Limit to top N
    const canvasSlice = allCanvases.slice(0, MAX_CANVASES);
    const segmentSlice = trackableSegments.slice(0, MAX_SEGMENTS);

    // Step 3: Fetch details in parallel
    const [canvasDetails, segmentDetails] = await Promise.all([
      Promise.all(
        canvasSlice.map(async (c): Promise<CanvasRow> => {
          try {
            const summary = await getCanvasDataSummary(c.id, 7);
            const stats = summary.data?.total_stats;

            return {
              id: c.id,
              name: c.name,
              entries: stats?.entries ?? 0,
              messagesSent: 0, // not available in data_summary
              conversions: stats?.conversions ?? 0,
              revenue: stats?.revenue ?? 0,
            };
          } catch {
            return {
              id: c.id,
              name: c.name,
              entries: 0,
              messagesSent: 0,
              conversions: 0,
              revenue: 0,
            };
          }
        })
      ),
      Promise.all(
        segmentSlice.map(async (s): Promise<SegmentRow> => {
          try {
            const series = await getSegmentDataSeries(s.id, 7);
            const points = series.data ?? [];
            const sizes = points.map((p) => p.size);
            // Drop trailing zeros (incomplete / future day reported by Braze)
            while (sizes.length > 0 && sizes[sizes.length - 1] === 0) {
              sizes.pop();
            }
            const currentSize = sizes.at(-1) ?? 0;
            const firstSize = sizes.at(0) ?? 0;
            const trend7d =
              firstSize > 0
                ? ((currentSize - firstSize) / firstSize) * 100
                : 0;

            return {
              id: s.id,
              name: s.name,
              currentSize,
              trend7d,
              sparklineData: sizes,
            };
          } catch {
            return {
              id: s.id,
              name: s.name,
              currentSize: 0,
              trend7d: 0,
              sparklineData: [],
            };
          }
        })
      ),
    ]);

    const snapshot: BrazeSnapshot = {
      canvases: canvasDetails,
      segments: segmentDetails,
      fetchedAt: new Date().toISOString(),
    };

    setInCache(CACHE_KEY, snapshot);

    return NextResponse.json(snapshot, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
