"use client";

import { Cell, Pie, PieChart as RPieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getSeriesColor } from "@/lib/charts/palette";

export function PieChart({
  rows,
  donut,
}: {
  rows: Record<string, unknown>[];
  donut?: boolean;
}) {
  const config = Object.fromEntries(
    rows.map((row, i) => [String(row.color ?? i), { label: String(row.color ?? i), color: getSeriesColor(i) }])
  );

  return (
    <ChartContainer config={config} className="w-full h-full">
      <RPieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="color" />} />
        <Pie
          data={rows}
          dataKey="y"
          nameKey="color"
          innerRadius={donut ? "55%" : 0}
          outerRadius="80%"
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={getSeriesColor(i)} />
          ))}
        </Pie>
      </RPieChart>
    </ChartContainer>
  );
}
