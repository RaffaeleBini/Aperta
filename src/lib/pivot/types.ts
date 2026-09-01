import type { AggFn } from "../sql/aggregations";
import type { SqlFilter } from "../sql/filters";

export type { AggFn } from "../sql/aggregations";
export type { FilterOp } from "../sql/filters";

export type DateGranularity = "year" | "quarter" | "month" | "day";

export interface PivotField {
  field: string;
  dateGranularity?: DateGranularity;
}

export interface PivotValueField {
  field: string;
  agg: AggFn;
  label?: string;
}

export type PivotFilter = SqlFilter;

export type PivotShelfName = "rows" | "columns" | "values";

export interface PivotConfig {
  version: 1;
  rows: PivotField[];
  columns: PivotField[];
  values: PivotValueField[];
  filters: PivotFilter[];
}

export function emptyPivotConfig(): PivotConfig {
  return { version: 1, rows: [], columns: [], values: [], filters: [] };
}
