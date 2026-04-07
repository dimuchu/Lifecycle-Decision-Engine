import type { NormalizedCanvas, AuditFinding } from "@/types/canvas-audit";

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const GENERIC_EVENTS = [
  "session_start",
  "app_open",
  "any_purchase",
  "custom_event",
];

export function checkNoConversionEvent(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.conversionGoals.length === 0) {
    return {
      dimension: "goal",
      severity: "critical",
      title: "No conversion event configured",
      detail:
        "This canvas has no conversion behavior set. Without a goal, performance cannot be measured.",
    };
  }
  return null;
}

export function checkWideConversionWindow(
  canvas: NormalizedCanvas
): AuditFinding | null {
  const wide = canvas.conversionGoals.find(
    (g) => g.windowSeconds > SEVEN_DAYS_SEC
  );
  if (wide) {
    const days = Math.round(wide.windowSeconds / (24 * 60 * 60));
    return {
      dimension: "goal",
      severity: "warning",
      title: "Conversion window exceeds 7 days",
      detail: `Goal "${wide.type}" has a ${days}-day window. Wide windows dilute attribution accuracy.`,
    };
  }
  return null;
}

export function checkGenericEvent(
  canvas: NormalizedCanvas
): AuditFinding | null {
  const generic = canvas.conversionGoals.find((g) =>
    GENERIC_EVENTS.includes(g.eventName ?? g.type)
  );
  if (generic) {
    return {
      dimension: "goal",
      severity: "info",
      title: "Generic conversion event",
      detail: `Goal uses "${generic.eventName ?? generic.type}" which is broad. Consider a more specific event for clearer attribution.`,
    };
  }
  return null;
}

export const goalRules = [
  checkNoConversionEvent,
  checkWideConversionWindow,
  checkGenericEvent,
];
