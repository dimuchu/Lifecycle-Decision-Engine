"use client";

import { AreaChart, Area } from "recharts";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

type TrendColor = "green" | "red" | "yellow";

function getTrendColor(data: number[]): TrendColor {
  if (data.length < 2) return "yellow";
  const first = data[0];
  const last = data[data.length - 1];
  if (first === 0) return "yellow";
  const change = ((last - first) / first) * 100;
  if (change > 10) return "green";
  if (change < -10) return "red";
  return "yellow";
}

const colorMap: Record<TrendColor, string> = {
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
};

export default function Sparkline({
  data,
  width = 60,
  height = 30,
}: SparklineProps) {
  if (data.length === 0)
    return <span className="text-muted-foreground">—</span>;

  const trend = getTrendColor(data);
  const color = colorMap[trend];
  const chartData = data.map((value) => ({ value }));
  const gradientId = `spark-fill-${trend}`;

  return (
    <AreaChart width={width} height={height} data={chartData}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        fill={`url(#${gradientId})`}
        isAnimationActive={false}
        dot={false}
      />
    </AreaChart>
  );
}
