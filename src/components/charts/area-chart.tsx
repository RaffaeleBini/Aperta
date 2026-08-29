"use client";

import { Area, AreaChart as RAreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { pivotForCategorySeries } from "@/lib/charts/client-transforms";
import { getSeriesColor } from "@/lib/charts/palette";
import type { BuiltChartQuery } from "@/lib/charts/query-builder";

export function AreaChart({
  rows,
  columnMap,
  stacked,
}: {
  rows: Record<string, unknown>[];
  columnMap: BuiltChartQuery["columnMap"];
  stacked?: boolean;
}) {
  const { data, series } = pivotForCategorySeries(rows, columnMap);
  const config = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: getSeriesColor(i) }])
  );

  return (
    <ChartContainer config={config} className="w-full h-full">
      <RAreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="x" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((s, i) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="monotone"
            fill={getSeriesColor(i)}
            stroke={getSeriesColor(i)}
            fillOpacity={0.3}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RAreaChart>
    </ChartContainer>
  );
}
