// ── Raw Braze Canvas Details (from /canvas/details) ──

export interface BrazeCanvasStep {
  name: string;
  id: string;
  type: string;
  channels?: string[];
  next_step_ids?: string[];
  next_paths?: Array<{
    name?: string;
    next_step_id?: string;
    percentage?: number;
  }>;
}

export interface BrazeCanvasVariant {
  name: string;
  id: string;
  first_step_ids?: string[];
  percentage?: number;
}

export interface BrazeConversionBehavior {
  type: string;
  window?: number; // seconds
  custom_event_name?: string;
  product?: string;
}

export interface BrazeCanvasDetails {
  created_at: string;
  updated_at: string;
  name: string;
  description?: string;
  archived: boolean;
  draft: boolean;
  schedule_type: string;
  first_entry?: string;
  last_entry?: string;
  channels?: string[];
  variants?: BrazeCanvasVariant[];
  tags?: string[];
  steps?: BrazeCanvasStep[];
  conversion_behaviors?: BrazeConversionBehavior[];
}

// ── Normalized Internal Schema ──

export interface NormalizedConversionGoal {
  type: string;
  windowSeconds: number;
  eventName?: string;
  product?: string;
}

export interface NormalizedStepMetrics {
  sent: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface NormalizedStep {
  id: string;
  name: string;
  type: string;
  channels: string[];
  depth: number;
  nextStepIds: string[];
  metrics: NormalizedStepMetrics;
}

export interface NormalizedVariantMetrics {
  entries: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  revenuePerEntry: number;
}

export interface NormalizedVariant {
  id: string;
  name: string;
  percentage: number;
  isControl: boolean;
  firstStepIds: string[];
  metrics: NormalizedVariantMetrics;
}

export interface NormalizedCanvas {
  id: string;
  name: string;
  description: string;
  tags: string[];
  scheduleType: string;
  createdAt: string;
  updatedAt: string;
  steps: NormalizedStep[];
  variants: NormalizedVariant[];
  conversionGoals: NormalizedConversionGoal[];
  maxDepth: number;
  totalBranches: number;
  hasControl: boolean;
  totalEntries: number;
  totalConversions: number;
  totalRevenue: number;
  totalSent: number;
}

// ── Audit Results ──

export type FindingSeverity = "critical" | "warning" | "info" | "pass";

export type AuditDimension =
  | "goal"
  | "structure"
  | "performance"
  | "experimentation"
  | "measurement";

export interface AuditFinding {
  dimension: AuditDimension;
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface DimensionScore {
  dimension: AuditDimension;
  score: number;
  findings: AuditFinding[];
}

export interface StepDropoff {
  stepId: string;
  stepName: string;
  inflow: number;
  outflow: number;
  dropoffRate: number;
}

export interface VariantComparison {
  variantId: string;
  variantName: string;
  entries: number;
  conversions: number;
  conversionRate: number;
  revenuePerEntry: number;
  upliftVsControl: number | null;
}

export interface DerivedMetrics {
  overallConversionRate: number;
  overallRevenuePerEntry: number;
  stepDropoffs: StepDropoff[];
  variantComparisons: VariantComparison[];
}

export interface CanvasAuditResult {
  canvasId: string;
  canvasName: string;
  healthScore: number;
  dimensions: DimensionScore[];
  findings: AuditFinding[];
  derivedMetrics: DerivedMetrics;
  normalizedCanvas: NormalizedCanvas;
  auditedAt: string;
}

// ── API Response Types ──

export interface CanvasAuditListItem {
  id: string;
  name: string;
  tags: string[];
  lastEdited: string;
  healthScore: number; // -1 = not audited
}

export interface CanvasAuditListResponse {
  canvases: CanvasAuditListItem[];
  fetchedAt: string;
}
