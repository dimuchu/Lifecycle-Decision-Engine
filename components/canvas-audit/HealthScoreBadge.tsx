"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HealthScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
}

export default function HealthScoreBadge({
  score,
  size = "sm",
}: HealthScoreBadgeProps) {
  if (score < 0) {
    return (
      <Badge variant="outline" className={cn(size === "lg" && "text-base px-3 py-1")}>
        Not audited
      </Badge>
    );
  }

  const variant =
    score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive";

  const colorClass =
    score >= 70
      ? "bg-green-600 hover:bg-green-700 text-white"
      : score >= 40
        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
        : "";

  return (
    <Badge
      variant={variant}
      className={cn(
        colorClass,
        size === "lg" && "text-lg px-4 py-1.5"
      )}
    >
      {score}
    </Badge>
  );
}
