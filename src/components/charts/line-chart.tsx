"use client";

import { CartesianGrid, Line, LineChart as RLineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { pivotForCategorySeries } from "@/lib/charts/client-transforms";
import { getSeriesColor } from "@/lib/charts/palette";
import type { BuiltChartQuery } from "@/lib/charts/query-builder";

export function LineChart({
  rows,
  columnMap,
}: {
  rows: Record<string, unknown>[];
  columnMap: BuiltChartQuery["columnMap"];
}) {
  const { data, series } = pivotForCategorySeries(rows, columnMap);
  const config = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: getSeriesColor(i) }])
  );

  return (
    <ChartContainer config={config} className="w-full h-full">
      <RLineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="x" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={getSeriesColor(i)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RLineChart>
    </ChartContainer>
  );
}
