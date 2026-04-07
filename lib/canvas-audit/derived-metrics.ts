import type {
  NormalizedCanvas,
  StepDropoff,
  VariantComparison,
  DerivedMetrics,
} from "@/types/canvas-audit";

export function computeStepDropoffs(canvas: NormalizedCanvas): StepDropoff[] {
  // Only message steps with sent > 0
  const messageSteps = canvas.steps.filter((s) => s.metrics.sent > 0);

  // Sort by depth for logical ordering
  const sorted = [...messageSteps].sort((a, b) => a.depth - b.depth);

  return sorted.map((step, i) => {
    const inflow = step.metrics.sent;
    // Outflow = sum of sent in immediate next steps, or conversions if last
    let outflow = 0;
    for (const nextId of step.nextStepIds) {
      const nextStep = canvas.steps.find((s) => s.id === nextId);
      if (nextStep) outflow += nextStep.metrics.sent;
    }
    // If no next steps, use opens + clicks as proxy for engagement
    if (step.nextStepIds.length === 0) {
      outflow = step.metrics.uniqueOpens;
    }
    // If first step and no prior, inflow is entries
    if (i === 0 && canvas.totalEntries > inflow) {
      // keep sent as inflow
    }

    const dropoffRate = inflow > 0 ? Math.max(0, (inflow - outflow) / inflow) : 0;

    return {
      stepId: step.id,
      stepName: step.name,
      inflow,
      outflow,
      dropoffRate,
    };
  });
}

export function computeVariantComparisons(
  canvas: NormalizedCanvas
): VariantComparison[] {
  const control = canvas.variants.find((v) => v.isControl);
  const controlRate = control?.metrics.conversionRate ?? null;

  return canvas.variants.map((v) => ({
    variantId: v.id,
    variantName: v.name,
    entries: v.metrics.entries,
    conversions: v.metrics.conversions,
    conversionRate: v.metrics.conversionRate,
    revenuePerEntry: v.metrics.revenuePerEntry,
    upliftVsControl:
      controlRate !== null && controlRate > 0 && !v.isControl
        ? (v.metrics.conversionRate - controlRate) / controlRate
        : null,
  }));
}

export function computeAllDerivedMetrics(
  canvas: NormalizedCanvas
): DerivedMetrics {
  const overallConversionRate =
    canvas.totalEntries > 0
      ? canvas.totalConversions / canvas.totalEntries
      : 0;

  const overallRevenuePerEntry =
    canvas.totalEntries > 0 ? canvas.totalRevenue / canvas.totalEntries : 0;

  return {
    overallConversionRate,
    overallRevenuePerEntry,
    stepDropoffs: computeStepDropoffs(canvas),
    variantComparisons: computeVariantComparisons(canvas),
  };
}
