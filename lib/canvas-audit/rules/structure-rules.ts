import type { NormalizedCanvas, AuditFinding } from "@/types/canvas-audit";

export function checkTooManySteps(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.steps.length > 15) {
    return {
      dimension: "structure",
      severity: "warning",
      title: "Canvas has more than 15 steps",
      detail: `${canvas.steps.length} steps detected. Complex canvases are harder to maintain and debug.`,
    };
  }
  return null;
}

export function checkDeepDepth(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.maxDepth > 10) {
    return {
      dimension: "structure",
      severity: "warning",
      title: "Canvas depth exceeds 10 levels",
      detail: `Max depth is ${canvas.maxDepth}. Deep funnels increase drop-off and reduce deliverability.`,
    };
  }
  return null;
}

export function checkNoControl(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.variants.length > 1 && !canvas.hasControl) {
    return {
      dimension: "structure",
      severity: "warning",
      title: "No control group in multi-variant canvas",
      detail:
        "Multiple variants exist but none is a control. Without a holdout group, incremental lift cannot be measured.",
    };
  }
  return null;
}

export function checkDeadEndSteps(
  canvas: NormalizedCanvas
): AuditFinding | null {
  const deadEnds = canvas.steps.filter(
    (s) => s.nextStepIds.length === 0 && s.type !== "message"
  );
  if (deadEnds.length > 0) {
    return {
      dimension: "structure",
      severity: "warning",
      title: "Dead-end non-message steps detected",
      detail: `${deadEnds.length} step(s) have no outgoing connections and aren't message steps: ${deadEnds.map((s) => s.name).join(", ")}.`,
    };
  }
  return null;
}

export const structureRules = [
  checkTooManySteps,
  checkDeepDepth,
  checkNoControl,
  checkDeadEndSteps,
];
