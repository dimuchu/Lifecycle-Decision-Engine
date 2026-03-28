"use client";

import { AreaChart, Area } from "recharts";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

function getColor(data: number[]): string {
  if (data.length < 2) return "#eab308"; // yellow
  const first = data[0];
  const last = data[data.length - 1];
  if (first === 0) return "#eab308";
  const change = ((last - first) / first) * 100;
  if (change > 10) return "#22c55e"; // green
  if (change < -10) return "#ef4444"; // red
  return "#eab308"; // yellow
}

export default function Sparkline({
  data,
  width = 60,
  height = 30,
}: SparklineProps) {
  if (data.length === 0) return <span className="text-gray-400">—</span>;

  const color = getColor(data);
  const chartData = data.map((value) => ({ value }));

  return (
    <AreaChart width={width} height={height} data={chartData}>
      <defs>
        <linearGradient id={`fill-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        fill={`url(#fill-${color})`}
        isAnimationActive={false}
        dot={false}
      />
    </AreaChart>
  );
}
