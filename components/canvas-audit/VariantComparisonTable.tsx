"use client";

import type { VariantComparison } from "@/types/canvas-audit";
import SortableTable, { type Column } from "@/components/SortableTable";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VariantComparisonTableProps {
  variants: VariantComparison[];
}

const columns: Column<VariantComparison>[] = [
  {
    key: "variantName",
    label: "Variant",
    render: (r) => <span className="font-medium">{r.variantName}</span>,
  },
  {
    key: "entries",
    label: "Entries",
    numeric: true,
    render: (r) => formatNumber(r.entries),
  },
  {
    key: "conversions",
    label: "Conversions",
    numeric: true,
    render: (r) => formatNumber(r.conversions),
  },
  {
    key: "conversionRate",
    label: "Conv. Rate",
    numeric: true,
    render: (r) => `${(r.conversionRate * 100).toFixed(2)}%`,
  },
  {
    key: "revenuePerEntry",
    label: "Rev/Entry",
    numeric: true,
    render: (r) => formatCurrency(r.revenuePerEntry),
  },
  {
    key: "upliftVsControl",
    label: "Uplift vs Control",
    numeric: true,
    render: (r) => {
      if (r.upliftVsControl === null) {
        return <span className="text-muted-foreground">—</span>;
      }
      const pct = (r.upliftVsControl * 100).toFixed(1);
      const variant =
        r.upliftVsControl > 0
          ? "default"
          : r.upliftVsControl < 0
            ? "destructive"
            : "secondary";
      return (
        <Badge variant={variant}>
          {r.upliftVsControl > 0 ? "+" : ""}
          {pct}%
        </Badge>
      );
    },
  },
];

export default function VariantComparisonTable({
  variants,
}: VariantComparisonTableProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Variant Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <SortableTable
          columns={columns}
          data={variants}
          defaultSortKey="conversionRate"
          defaultSortDir="desc"
        />
      </CardContent>
    </Card>
  );
}
