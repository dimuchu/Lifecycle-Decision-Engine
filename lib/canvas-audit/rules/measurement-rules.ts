import type { NormalizedCanvas, AuditFinding } from "@/types/canvas-audit";

const SEVENTY_TWO_HOURS_SEC = 72 * 60 * 60;

export function checkWideAttribution(
  canvas: NormalizedCanvas
): AuditFinding | null {
  const wide = canvas.conversionGoals.find(
    (g) => g.windowSeconds > SEVENTY_TWO_HOURS_SEC
  );
  if (wide) {
    const hours = Math.round(wide.windowSeconds / 3600);
    return {
      dimension: "measurement",
      severity: "warning",
      title: "Attribution window exceeds 72 hours",
      detail: `Goal "${wide.type}" has a ${hours}h window. Long windows inflate attributed conversions and make measurement noisy.`,
    };
  }
  return null;
}

export function checkNoStepMetrics(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.steps.length === 0) return null;
  const hasAnyMetrics = canvas.steps.some(
    (s) => s.metrics.sent > 0 || s.metrics.conversions > 0
  );
  if (!hasAnyMetrics) {
    return {
      dimension: "measurement",
      severity: "warning",
      title: "No step-level metrics available",
      detail:
        "None of the steps have recorded sends or conversions. Data may not be flowing or the canvas may be newly launched.",
    };
  }
  return null;
}

export function checkRevenueWithoutConversions(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.totalRevenue > 0 && canvas.totalConversions === 0) {
    return {
      dimension: "measurement",
      severity: "info",
      title: "Revenue recorded without conversions",
      detail:
        "Revenue is attributed but conversions are zero. This may indicate a misconfigured conversion event or delayed attribution.",
    };
  }
  return null;
}

export const measurementRules = [
  checkWideAttribution,
  checkNoStepMetrics,
  checkRevenueWithoutConversions,
];
