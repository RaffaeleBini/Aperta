"use client";

import { CartesianGrid, Scatter, ScatterChart as RScatterChart, XAxis, YAxis, ZAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { groupByColor } from "@/lib/charts/client-transforms";
import { getSeriesColor } from "@/lib/charts/palette";
import type { BuiltChartQuery } from "@/lib/charts/query-builder";

export function ScatterChartView({
  rows,
  columnMap,
}: {
  rows: Record<string, unknown>[];
  columnMap: BuiltChartQuery["columnMap"];
}) {
  const groups = groupByColor(rows, columnMap);
  const hasSize = "size" in columnMap;
  const config = Object.fromEntries(
    groups.map((g, i) => [g.key, { label: g.label || g.key, color: getSeriesColor(i) }])
  );

  return (
    <ChartContainer config={config} className="w-full h-full">
      <RScatterChart>
        <CartesianGrid />
        <XAxis dataKey="x" type="number" tickLine={false} axisLine={false} />
        <YAxis dataKey="y" type="number" tickLine={false} axisLine={false} />
        {hasSize && <ZAxis dataKey="size" range={[40, 400]} />}
        <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
        {groups.map((g, i) => (
          <Scatter key={g.key} name={g.label || g.key} data={g.rows} fill={getSeriesColor(i)} />
        ))}
      </RScatterChart>
    </ChartContainer>
  );
}
