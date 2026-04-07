"use client";

import type { AuditFinding } from "@/types/canvas-audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    label: "Info",
  },
  pass: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900",
    label: "Pass",
  },
};

interface FindingsListProps {
  findings: AuditFinding[];
}

export default function FindingsList({ findings }: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle className="mx-auto mb-2 size-8 text-green-500" />
          No issues found. Canvas looks healthy!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Findings ({findings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.map((finding, i) => {
          const config = severityConfig[finding.severity];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-3",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 size-4 shrink-0", config.color)} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{finding.title}</span>
                    <span
                      className={cn(
                        "text-xs font-medium uppercase",
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {finding.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
