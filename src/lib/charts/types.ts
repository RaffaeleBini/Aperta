import type { AggFn } from "../sql/aggregations";
import type { SqlFilter } from "../sql/filters";

export type { AggFn } from "../sql/aggregations";
export type { FilterOp } from "../sql/filters";

export type ChartType = "bar" | "line" | "area" | "scatter" | "pie" | "heatmap";

export type DateGranularity = "year" | "quarter" | "month" | "day";

export interface ShelfField {
  field: string;
  agg?: AggFn;
  label?: string;
  dateGranularity?: DateGranularity;
}

export type ChartFilter = SqlFilter;

export type ShelfName = "x" | "y" | "color" | "size" | "group";

export interface ChartConfig {
  version: 1;
  chartType: ChartType;
  shelves: Partial<Record<ShelfName, ShelfField[]>>;
  filters: ChartFilter[];
  options?: {
    stacked?: boolean;
    donut?: boolean;
    sortX?: "asc" | "desc" | "value_desc" | "none";
    limit?: number;
  };
}

export function emptyChartConfig(chartType: ChartType): ChartConfig {
  return { version: 1, chartType, shelves: {}, filters: [] };
}
