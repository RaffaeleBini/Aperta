export type ChartType = "bar" | "line" | "area" | "scatter" | "pie" | "heatmap";

export type AggFn = "sum" | "avg" | "count" | "count_distinct" | "min" | "max";

export type DateGranularity = "year" | "quarter" | "month" | "day";

export type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null";

export interface ShelfField {
  field: string;
  agg?: AggFn;
  label?: string;
  dateGranularity?: DateGranularity;
}

export interface ChartFilter {
  field: string;
  op: FilterOp;
  value?: string | number | (string | number)[];
}

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
