import type { NormalizedCanvas, AuditFinding } from "@/types/canvas-audit";
import { computeStepDropoffs } from "../derived-metrics";

export function checkHighDropoff(
  canvas: NormalizedCanvas
): AuditFinding | null {
  const dropoffs = computeStepDropoffs(canvas);
  const critical = dropoffs.find((d) => d.dropoffRate > 0.5 && d.inflow > 100);
  if (critical) {
    return {
      dimension: "performance",
      severity: "critical",
      title: `High drop-off at "${critical.stepName}"`,
      detail: `${(critical.dropoffRate * 100).toFixed(0)}% drop-off (${critical.inflow} in → ${critical.outflow} out). Investigate timing, content, or audience fit.`,
    };
  }
  return null;
}

export function checkZeroConversions(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.totalEntries > 100 && canvas.totalConversions === 0) {
    return {
      dimension: "performance",
      severity: "warning",
      title: "Zero conversions despite entries",
      detail: `${canvas.totalEntries} entries but 0 conversions. Check if the conversion event is firing correctly.`,
    };
  }
  return null;
}

export function checkLowOpenRate(
  canvas: NormalizedCanvas
): AuditFinding | null {
  const emailSteps = canvas.steps.filter(
    (s) => s.channels.includes("email") && s.metrics.sent > 100
  );
  for (const step of emailSteps) {
    const openRate = step.metrics.sent > 0
      ? step.metrics.uniqueOpens / step.metrics.sent
      : 0;
    if (openRate < 0.1) {
      return {
        dimension: "performance",
        severity: "warning",
        title: `Low open rate at "${step.name}"`,
        detail: `${(openRate * 100).toFixed(1)}% unique open rate. Consider improving subject line or send time.`,
      };
    }
  }
  return null;
}

export function checkZeroSends(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.totalEntries > 0 && canvas.totalSent === 0) {
    return {
      dimension: "performance",
      severity: "warning",
      title: "No messages sent despite entries",
      detail: `${canvas.totalEntries} entries but 0 messages sent. Check audience filters, channel connectivity, or step configuration.`,
    };
  }
  return null;
}

export const performanceRules = [
  checkHighDropoff,
  checkZeroConversions,
  checkLowOpenRate,
  checkZeroSends,
];
