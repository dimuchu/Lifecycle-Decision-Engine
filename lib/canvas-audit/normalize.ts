import type {
  BrazeCanvasDetails,
  NormalizedCanvas,
  NormalizedStep,
  NormalizedStepMetrics,
  NormalizedVariant,
  NormalizedConversionGoal,
} from "@/types/canvas-audit";
import type {
  BrazeCanvasDataSummary,
  BrazeCanvasDataSeries,
} from "@/types/braze";

function toNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function computeStepDepths(
  steps: BrazeCanvasDetails["steps"]
): Map<string, number> {
  const depthMap = new Map<string, number>();
  if (!steps?.length) return depthMap;

  const adjacency = new Map<string, string[]>();
  const allIds = new Set<string>();
  const hasIncoming = new Set<string>();

  for (const step of steps) {
    allIds.add(step.id);
    const nextIds: string[] = [];
    if (step.next_step_ids) nextIds.push(...step.next_step_ids);
    if (step.next_paths) {
      for (const p of step.next_paths) {
        if (p.next_step_id) nextIds.push(p.next_step_id);
      }
    }
    adjacency.set(step.id, nextIds);
    for (const nid of nextIds) hasIncoming.add(nid);
  }

  // BFS from root nodes (no incoming edges)
  const roots = [...allIds].filter((id) => !hasIncoming.has(id));
  if (roots.length === 0 && allIds.size > 0) {
    roots.push([...allIds][0]);
  }

  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
    id,
    depth: 0,
  }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depthMap.has(id) && depthMap.get(id)! >= depth) continue;
    depthMap.set(id, depth);
    for (const nextId of adjacency.get(id) ?? []) {
      queue.push({ id: nextId, depth: depth + 1 });
    }
  }

  // Any unreachable steps get depth 0
  for (const id of allIds) {
    if (!depthMap.has(id)) depthMap.set(id, 0);
  }

  return depthMap;
}

function extractStepMetrics(
  stepId: string,
  summary: BrazeCanvasDataSummary
): NormalizedStepMetrics {
  const stepStats = summary.data?.step_stats?.[stepId];
  if (!stepStats) {
    return { sent: 0, opens: 0, uniqueOpens: 0, clicks: 0, conversions: 0, revenue: 0 };
  }

  let sent = 0;
  let opens = 0;
  let uniqueOpens = 0;
  let clicks = 0;

  const messages = stepStats.messages ?? {};
  for (const channelVariants of Object.values(messages)) {
    for (const v of channelVariants) {
      sent += toNum(v.sent);
      opens += toNum(v.opens);
      uniqueOpens += toNum(v.unique_opens);
      clicks += toNum(v.clicks);
    }
  }

  return {
    sent,
    opens,
    uniqueOpens,
    clicks,
    conversions: toNum(stepStats.conversions),
    revenue: toNum(stepStats.revenue),
  };
}

export function buildNormalizedCanvas(
  canvasId: string,
  details: BrazeCanvasDetails,
  summary: BrazeCanvasDataSummary,
  _series: BrazeCanvasDataSeries
): NormalizedCanvas {
  const depthMap = computeStepDepths(details.steps);
  const maxDepth = depthMap.size > 0 ? Math.max(...depthMap.values()) : 0;

  // Normalize steps
  const steps: NormalizedStep[] = (details.steps ?? []).map((s) => {
    const nextIds: string[] = [];
    if (s.next_step_ids) nextIds.push(...s.next_step_ids);
    if (s.next_paths) {
      for (const p of s.next_paths) {
        if (p.next_step_id) nextIds.push(p.next_step_id);
      }
    }

    return {
      id: s.id,
      name: s.name,
      type: s.type,
      channels: s.channels ?? [],
      depth: depthMap.get(s.id) ?? 0,
      nextStepIds: nextIds,
      metrics: extractStepMetrics(s.id, summary),
    };
  });

  // Count branches (steps with >1 outgoing edge)
  const totalBranches = steps.filter((s) => s.nextStepIds.length > 1).length;

  // Normalize variants
  const variantStats = summary.data?.variant_stats ?? {};
  const hasControl = (details.variants ?? []).some(
    (v) => v.name.toLowerCase().includes("control") || v.percentage === 0
  );

  const variants: NormalizedVariant[] = (details.variants ?? []).map((v) => {
    const stats = variantStats[v.id];
    const entries = toNum(stats?.entries);
    const conversions = toNum(stats?.conversions);
    const revenue = toNum(stats?.revenue);

    return {
      id: v.id,
      name: v.name,
      percentage: toNum(v.percentage),
      isControl:
        v.name.toLowerCase().includes("control") || v.percentage === 0,
      firstStepIds: v.first_step_ids ?? [],
      metrics: {
        entries,
        conversions,
        revenue,
        conversionRate: entries > 0 ? conversions / entries : 0,
        revenuePerEntry: entries > 0 ? revenue / entries : 0,
      },
    };
  });

  // Normalize conversion goals
  const conversionGoals: NormalizedConversionGoal[] = (
    details.conversion_behaviors ?? []
  ).map((cb) => ({
    type: cb.type,
    windowSeconds: toNum(cb.window),
    eventName: cb.custom_event_name,
    product: cb.product,
  }));

  // Totals from summary
  const totalStats = summary.data?.total_stats;
  const totalEntries = toNum(
    totalStats?.entries ?? totalStats?.total_entries
  );
  const totalConversions = toNum(
    totalStats?.conversions ?? totalStats?.total_conversions
  );
  const totalRevenue = toNum(
    totalStats?.revenue ?? totalStats?.total_revenue
  );
  const totalSent = steps.reduce((sum, s) => sum + s.metrics.sent, 0);

  return {
    id: canvasId,
    name: details.name,
    description: details.description ?? "",
    tags: details.tags ?? [],
    scheduleType: details.schedule_type,
    createdAt: details.created_at,
    updatedAt: details.updated_at,
    steps,
    variants,
    conversionGoals,
    maxDepth,
    totalBranches,
    hasControl,
    totalEntries,
    totalConversions,
    totalRevenue,
    totalSent,
  };
}
