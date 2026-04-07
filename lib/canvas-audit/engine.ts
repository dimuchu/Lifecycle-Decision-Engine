import type {
  NormalizedCanvas,
  CanvasAuditResult,
  DimensionScore,
  AuditFinding,
  AuditDimension,
  FindingSeverity,
} from "@/types/canvas-audit";
import { computeAllDerivedMetrics } from "./derived-metrics";
import { goalRules } from "./rules/goal-rules";
import { structureRules } from "./rules/structure-rules";
import { performanceRules } from "./rules/performance-rules";
import { experimentationRules } from "./rules/experimentation-rules";
import { measurementRules } from "./rules/measurement-rules";

type RuleFn = (canvas: NormalizedCanvas) => AuditFinding | null;

const DIMENSION_RULES: Record<AuditDimension, RuleFn[]> = {
  goal: goalRules,
  structure: structureRules,
  performance: performanceRules,
  experimentation: experimentationRules,
  measurement: measurementRules,
};

const DIMENSION_WEIGHTS: Record<AuditDimension, number> = {
  performance: 0.35,
  experimentation: 0.2,
  goal: 0.15,
  structure: 0.15,
  measurement: 0.15,
};

const SEVERITY_PENALTY: Record<FindingSeverity, number> = {
  critical: 30,
  warning: 15,
  info: 5,
  pass: 0,
};

const SEVERITY_ORDER: FindingSeverity[] = [
  "critical",
  "warning",
  "info",
  "pass",
];

function scoreDimension(
  dimension: AuditDimension,
  canvas: NormalizedCanvas
): DimensionScore {
  const rules = DIMENSION_RULES[dimension];
  const findings: AuditFinding[] = [];

  for (const rule of rules) {
    const finding = rule(canvas);
    if (finding) findings.push(finding);
  }

  let score = 100;
  for (const f of findings) {
    score -= SEVERITY_PENALTY[f.severity];
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension, score, findings };
}

export function runAudit(canvas: NormalizedCanvas): CanvasAuditResult {
  const dimensions: DimensionScore[] = (
    Object.keys(DIMENSION_RULES) as AuditDimension[]
  ).map((dim) => scoreDimension(dim, canvas));

  // Weighted health score
  const healthScore = Math.round(
    dimensions.reduce(
      (sum, d) => sum + d.score * DIMENSION_WEIGHTS[d.dimension],
      0
    )
  );

  // All findings sorted by severity
  const allFindings = dimensions
    .flatMap((d) => d.findings)
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) -
        SEVERITY_ORDER.indexOf(b.severity)
    );

  const derivedMetrics = computeAllDerivedMetrics(canvas);

  return {
    canvasId: canvas.id,
    canvasName: canvas.name,
    healthScore,
    dimensions,
    findings: allFindings,
    derivedMetrics,
    normalizedCanvas: canvas,
    auditedAt: new Date().toISOString(),
  };
}
