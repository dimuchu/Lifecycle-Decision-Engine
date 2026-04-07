import type { NormalizedCanvas, AuditFinding } from "@/types/canvas-audit";

export function checkNoControlGroup(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.variants.length >= 2 && !canvas.hasControl) {
    return {
      dimension: "experimentation",
      severity: "critical",
      title: "No control group for A/B test",
      detail:
        "Multiple variants but no control/holdout group. Incremental impact cannot be measured without a baseline.",
    };
  }
  return null;
}

export function checkSmallSampleSize(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.variants.length < 2) return null;
  const small = canvas.variants.find(
    (v) => !v.isControl && v.metrics.entries < 1000 && v.metrics.entries > 0
  );
  if (small) {
    return {
      dimension: "experimentation",
      severity: "warning",
      title: `Small sample size for "${small.name}"`,
      detail: `Only ${small.metrics.entries} entries. Results may not be statistically significant. Aim for 1,000+ per variant.`,
    };
  }
  return null;
}

export function checkUnevenSplit(
  canvas: NormalizedCanvas
): AuditFinding | null {
  if (canvas.variants.length < 2) return null;
  const nonControl = canvas.variants.filter((v) => !v.isControl);
  if (nonControl.length < 2) return null;

  const percentages = nonControl.map((v) => v.percentage);
  const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
  const maxDeviation = Math.max(...percentages.map((p) => Math.abs(p - avg)));

  if (maxDeviation > 20) {
    return {
      dimension: "experimentation",
      severity: "warning",
      title: "Uneven variant split",
      detail: `Non-control variants differ by more than 20 percentage points. Uneven splits reduce statistical power.`,
    };
  }
  return null;
}

export const experimentationRules = [
  checkNoControlGroup,
  checkSmallSampleSize,
  checkUnevenSplit,
];
