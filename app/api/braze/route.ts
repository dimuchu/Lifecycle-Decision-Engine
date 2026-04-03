import { NextResponse } from "next/server";
import {
  getCanvasList,
  getCanvasDataSummary,
  getCanvasDataSeries,
  getSegmentList,
  getSegmentDataSeries,
} from "@/lib/braze";
import { getFromCache, setInCache } from "@/lib/cache";
import type { BrazeSnapshot, CanvasRow, SegmentRow } from "@/types/braze";

export const dynamic = "force-dynamic";

const CACHE_KEY_PREFIX = "braze_snapshot_v2";
const MAX_CANVASES = 20;
const DEFAULT_SEGMENTS = 20;
const MAX_SEGMENTS_CAP = 100;

interface CanvasMetrics {
  entries: number;
  messagesSent: number;
  conversions: number;
  revenue: number;
}

type StepStatsMap = Record<
  string,
  {
    messages?: Record<
      string,
      Array<{
        sent?: number;
      }>
    >;
  }
>;

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sumStepMessages(stepStats?: StepStatsMap): number {
  if (!stepStats) return 0;

  return Object.values(stepStats).reduce((stepTotal, step) => {
    const channelTotal = Object.values(step.messages ?? {}).reduce(
      (channelAcc, variants) =>
        channelAcc +
        variants.reduce((variantAcc, variant) => variantAcc + toNumber(variant.sent), 0),
      0
    );
    return stepTotal + channelTotal;
  }, 0);
}

function normalizeTotals(
  totalStats?:
    | {
        revenue?: number;
        entries?: number;
        conversions?: number;
        total_revenue?: number;
        total_entries?: number;
        total_conversions?: number;
        total_messages_sent?: number;
      }
    | null
): CanvasMetrics | null {
  if (!totalStats) return null;

  return {
    entries: toNumber(totalStats.entries ?? totalStats.total_entries),
    messagesSent: toNumber(totalStats.total_messages_sent),
    conversions: toNumber(totalStats.conversions ?? totalStats.total_conversions),
    revenue: toNumber(totalStats.revenue ?? totalStats.total_revenue),
  };
}

function normalizeSummaryMetrics(
  summary: Awaited<ReturnType<typeof getCanvasDataSummary>>
): CanvasMetrics | null {
  const totals = normalizeTotals(summary.data?.total_stats);
  if (!totals) return null;

  return {
    ...totals,
    messagesSent:
      totals.messagesSent > 0
        ? totals.messagesSent
        : sumStepMessages(summary.data?.step_stats as StepStatsMap | undefined),
  };
}

function normalizeSeriesMetrics(
  series: Awaited<ReturnType<typeof getCanvasDataSeries>>
): CanvasMetrics | null {
  const points = series.data?.stats;
  if (!points?.length) return null;

  return points.reduce<CanvasMetrics>(
    (acc, point) => {
      const totals = point.total_stats;
      const pointEntries = toNumber(totals?.entries);
      const pointConversions = toNumber(totals?.conversions);
      const pointRevenue = toNumber(totals?.revenue);
      const pointMessages = sumStepMessages(point.step_stats as StepStatsMap | undefined);

      return {
        entries: acc.entries + pointEntries,
        messagesSent: acc.messagesSent + pointMessages,
        conversions: acc.conversions + pointConversions,
        revenue: acc.revenue + pointRevenue,
      };
    },
    { entries: 0, messagesSent: 0, conversions: 0, revenue: 0 }
  );
}

function mergeCanvasMetrics(
  primary: CanvasMetrics | null,
  fallback: CanvasMetrics | null
): CanvasMetrics {
  const p = primary ?? { entries: 0, messagesSent: 0, conversions: 0, revenue: 0 };
  const f = fallback ?? { entries: 0, messagesSent: 0, conversions: 0, revenue: 0 };

  return {
    entries: p.entries > 0 ? p.entries : f.entries,
    messagesSent: p.messagesSent > 0 ? p.messagesSent : f.messagesSent,
    conversions: p.conversions > 0 ? p.conversions : f.conversions,
    revenue: p.revenue > 0 ? p.revenue : f.revenue,
  };
}

export async function GET(request: Request) {
  // Parse segment limit from query params
  const { searchParams } = new URL(request.url);
  const segmentsParam = parseInt(searchParams.get("segments") ?? "", 10);
  const maxSegments = Number.isFinite(segmentsParam)
    ? Math.max(1, Math.min(segmentsParam, MAX_SEGMENTS_CAP))
    : DEFAULT_SEGMENTS;

  const cacheKey = `${CACHE_KEY_PREFIX}_seg${maxSegments}`;

  // Check cache first
  const cached = getFromCache<BrazeSnapshot>(cacheKey);
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
    const segmentSlice = trackableSegments.slice(0, maxSegments);

    // Step 3: Fetch details in parallel
    const [canvasDetails, segmentDetails] = await Promise.all([
      Promise.all(
        canvasSlice.map(async (c): Promise<CanvasRow> => {
          try {
            const [summaryResult, seriesResult] = await Promise.allSettled([
              getCanvasDataSummary(c.id, 7),
              getCanvasDataSeries(c.id, 7),
            ]);

            const summaryMetrics =
              summaryResult.status === "fulfilled"
                ? normalizeSummaryMetrics(summaryResult.value)
                : null;
            const seriesMetrics =
              seriesResult.status === "fulfilled"
                ? normalizeSeriesMetrics(seriesResult.value)
                : null;
            const metrics = mergeCanvasMetrics(summaryMetrics, seriesMetrics);

            return {
              id: c.id,
              name: c.name,
              entries: metrics.entries,
              messagesSent: metrics.messagesSent,
              conversions: metrics.conversions,
              revenue: metrics.revenue,
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

    setInCache(cacheKey, snapshot);

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
