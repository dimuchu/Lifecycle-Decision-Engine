// ── Raw Braze API response types ──

export interface BrazeCanvasListItem {
  id: string;
  name: string;
  last_edited: string;
  tags: string[];
}

export interface BrazeCanvasDataSummary {
  data: {
    name: string;
    total_stats: {
      revenue: number;
      entries: number;
      conversions: number;
    };
  };
}

export interface BrazeSegmentListItem {
  id: string;
  name: string;
  analytics_tracking_enabled: boolean;
  tags: string[];
}

export interface BrazeSegmentDataSeries {
  data: Array<{
    time: string;
    size: number;
  }>;
}

// ── Aggregated types for frontend ──

export interface CanvasRow {
  id: string;
  name: string;
  entries: number;
  messagesSent: number;
  conversions: number;
  revenue: number;
}

export interface SegmentRow {
  id: string;
  name: string;
  currentSize: number;
  trend7d: number;
  sparklineData: number[];
}

export interface BrazeSnapshot {
  canvases: CanvasRow[];
  segments: SegmentRow[];
  fetchedAt: string;
}

// ── Sort types ──

export type SortDirection = "asc" | "desc";

export interface SortState<T> {
  key: keyof T;
  direction: SortDirection;
}
