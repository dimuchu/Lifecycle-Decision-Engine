import type {
  BrazeCanvasListItem,
  BrazeCanvasDataSummary,
  BrazeCanvasDataSeries,
  BrazeSegmentListItem,
  BrazeSegmentDataSeries,
} from "@/types/braze";

const CANVAS_API_KEY = process.env.BRAZE_CANVAS_API_KEY ?? "";
const SEGMENT_API_KEY = process.env.BRAZE_SEGMENT_API_KEY ?? "";
const BASE_URL = process.env.BRAZE_REST_ENDPOINT ?? "";

export async function brazeFetch<T>(
  path: string,
  params?: Record<string, string>,
  apiKey: string = CANVAS_API_KEY
): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Braze API ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Canvas endpoints ──

interface CanvasListResponse {
  canvases: BrazeCanvasListItem[];
}

export async function getCanvasList(
  page = 0
): Promise<BrazeCanvasListItem[]> {
  const data = await brazeFetch<CanvasListResponse>("/canvas/list", {
    page: String(page),
    include_archived: "false",
    sort_direction: "desc",
  });
  return data.canvases ?? [];
}

export async function getCanvasDataSummary(
  canvasId: string,
  length = 7
): Promise<BrazeCanvasDataSummary> {
  const ending = new Date().toISOString();
  return brazeFetch<BrazeCanvasDataSummary>("/canvas/data_summary", {
    canvas_id: canvasId,
    length: String(length),
    ending_at: ending,
    include_variant_breakdown: "false",
    include_step_breakdown: "true",
  });
}

export async function getCanvasDataSeries(
  canvasId: string,
  length = 7
): Promise<BrazeCanvasDataSeries> {
  const ending = new Date().toISOString();
  return brazeFetch<BrazeCanvasDataSeries>("/canvas/data_series", {
    canvas_id: canvasId,
    length: String(length),
    ending_at: ending,
    include_variant_breakdown: "false",
    include_step_breakdown: "true",
  });
}

// ── Segment endpoints ──

interface SegmentListResponse {
  segments: BrazeSegmentListItem[];
}

export async function getSegmentList(
  page = 0
): Promise<BrazeSegmentListItem[]> {
  const data = await brazeFetch<SegmentListResponse>("/segments/list", {
    page: String(page),
    sort_direction: "desc",
  }, SEGMENT_API_KEY);
  return data.segments ?? [];
}

export async function getSegmentDataSeries(
  segmentId: string,
  length = 7
): Promise<BrazeSegmentDataSeries> {
  const ending = new Date().toISOString();
  return brazeFetch<BrazeSegmentDataSeries>("/segments/data_series", {
    segment_id: segmentId,
    length: String(length),
    ending_at: ending,
  }, SEGMENT_API_KEY);
}
