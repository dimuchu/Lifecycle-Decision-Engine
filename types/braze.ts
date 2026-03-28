// ── Raw Braze API response types ──

export interface BrazeCanvasListItem {
  id: string;
  name: string;
  last_edited: string;
  tags: string[];
}

export interface BrazeCanvasDataSummary {
  data?: {
    name?: string;
    total_stats?: {
      revenue?: number;
      entries?: number;
      conversions?: number;
      messages_sent?: number;
      total_revenue?: number;
      total_entries?: number;
      total_conversions?: number;
      total_messages_sent?: number;
    };
    variant_stats?: Record<
      string,
      {
        name?: string;
        revenue?: number;
        conversions?: number;
        conversions_by_entry_time?: number;
        entries?: number;
      }
    >;
    step_stats?: Record<
      string,
      {
        name?: string;
        revenue?: number;
        conversions?: number;
        conversions_by_entry_time?: number;
        messages?: Record<
          string,
          Array<{
            sent?: number;
            opens?: number;
            unique_opens?: number;
            clicks?: number;
          }>
        >;
      }
    >;
  };
}

export interface BrazeCanvasDataSeries {
  data?: {
    name?: string;
    stats?: Array<{
      time: string;
      total_stats?: {
        revenue?: number;
        entries?: number;
        conversions?: number;
        conversions_by_entry_time?: number;
      };
      variant_stats?: Record<
        string,
        {
          name?: string;
          revenue?: number;
          conversions?: number;
          conversions_by_entry_time?: number;
          entries?: number;
        }
      >;
      step_stats?: Record<
        string,
        {
          name?: string;
          revenue?: number;
          conversions?: number;
          conversions_by_entry_time?: number;
          messages?: Record<
            string,
            Array<{
              sent?: number;
              opens?: number;
              unique_opens?: number;
              clicks?: number;
            }>
          >;
        }
      >;
    }>;
    message?: string;
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
