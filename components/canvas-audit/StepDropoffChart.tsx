"use client";

import type { StepDropoff } from "@/types/canvas-audit";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StepDropoffChartProps {
  dropoffs: StepDropoff[];
}

export default function StepDropoffChart({ dropoffs }: StepDropoffChartProps) {
  if (dropoffs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step Drop-off</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No step-level data available
        </CardContent>
      </Card>
    );
  }

  const chartData = dropoffs.map((d) => ({
    name: d.stepName.length > 20 ? d.stepName.slice(0, 20) + "..." : d.stepName,
    fullName: d.stepName,
    inflow: d.inflow,
    outflow: d.outflow,
    dropoff: Math.round(d.dropoffRate * 100),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step Drop-off</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, dropoffs.length * 50)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value).toLocaleString(),
                name === "inflow" ? "Inflow" : "Outflow",
              ]}
              labelFormatter={(_label, payload) => {
                if (payload?.[0]?.payload?.fullName) {
                  return payload[0].payload.fullName as string;
                }
                return _label;
              }}
            />
            <Bar dataKey="inflow" name="inflow" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.dropoff > 50
                      ? "hsl(0, 72%, 51%)"
                      : entry.dropoff > 30
                        ? "hsl(45, 93%, 47%)"
                        : "hsl(142, 71%, 45%)"
                  }
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
            <Bar dataKey="outflow" name="outflow" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} fillOpacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
