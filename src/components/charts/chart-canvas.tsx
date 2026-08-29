"use client";

import { BarChart } from "./bar-chart";
import { LineChart } from "./line-chart";
import { AreaChart } from "./area-chart";
import { ScatterChartView } from "./scatter-chart";
import { PieChart } from "./pie-chart";
import { HeatmapChart } from "./heatmap-chart";
import { ChartEmptyState } from "./chart-empty-state";
import type { ChartConfig } from "@/lib/charts/types";
import type { BuiltChartQuery } from "@/lib/charts/query-builder";

export function ChartCanvas({
  config,
  rows,
  columnMap,
}: {
  config: ChartConfig;
  rows: Record<string, unknown>[] | null;
  columnMap: BuiltChartQuery["columnMap"] | null;
}) {
  if (!rows || !columnMap || rows.length === 0) {
    return <ChartEmptyState />;
  }

  switch (config.chartType) {
    case "bar":
      return <BarChart rows={rows} columnMap={columnMap} stacked={config.options?.stacked} />;
    case "line":
      return <LineChart rows={rows} columnMap={columnMap} />;
    case "area":
      return <AreaChart rows={rows} columnMap={columnMap} stacked={config.options?.stacked} />;
    case "scatter":
      return <ScatterChartView rows={rows} columnMap={columnMap} />;
    case "pie":
      return <PieChart rows={rows} donut={config.options?.donut} />;
    case "heatmap":
      return <HeatmapChart rows={rows} />;
  }
}
