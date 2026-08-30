import type { AggFn } from "../sql/aggregations";
import type { SqlFilter } from "../sql/filters";

export type StepType =
  | "rename_column"
  | "drop_column"
  | "change_type"
  | "filter_rows"
  | "calculated_column"
  | "group_by"
  | "join"
  | "split_column"
  | "combine_columns"
  | "fill_nulls"
  | "drop_nulls";

export const STEP_TYPES: StepType[] = [
  "rename_column",
  "drop_column",
  "change_type",
  "filter_rows",
  "calculated_column",
  "group_by",
  "join",
  "split_column",
  "combine_columns",
  "fill_nulls",
  "drop_nulls",
];

export type JoinType = "inner" | "left" | "right" | "full";
export type FillStrategy = "value" | "mean" | "median" | "mode" | "zero";

/** Tipos DuckDB permitidos como destino de "cambiar tipo" — nunca se interpola un tipo fuera de esta lista. */
export const DUCKDB_TYPE_WHITELIST = [
  "VARCHAR",
  "INTEGER",
  "BIGINT",
  "DOUBLE",
  "DATE",
  "TIMESTAMP",
  "BOOLEAN",
] as const;
export type DuckDbTargetType = (typeof DUCKDB_TYPE_WHITELIST)[number];

export interface RenameColumnParams {
  column: string;
  newName: string;
}
export interface DropColumnParams {
  column: string;
}
export interface ChangeTypeParams {
  column: string;
  newType: DuckDbTargetType;
}
export interface FilterRowsParams {
  filters: SqlFilter[];
}
export interface CalculatedColumnParams {
  name: string;
  expression: string;
}
export interface GroupByAggregation {
  column: string;
  fn: AggFn;
  outputName: string;
}
export interface GroupByParams {
  groupColumns: string[];
  aggregations: GroupByAggregation[];
}
export interface JoinParams {
  otherDatasetId: string;
  joinType: JoinType;
  onLeft: string;
  onRight: string;
}
export interface SplitColumnParams {
  column: string;
  delimiter: string;
  outputNames: string[];
}
export interface CombineColumnsParams {
  columns: string[];
  separator: string;
  outputName: string;
  dropOriginals?: boolean;
}
export interface FillNullsParams {
  column: string;
  strategy: FillStrategy;
  value?: string;
}
export interface DropNullsParams {
  columns: string[];
}

export interface StepParamsByType {
  rename_column: RenameColumnParams;
  drop_column: DropColumnParams;
  change_type: ChangeTypeParams;
  filter_rows: FilterRowsParams;
  calculated_column: CalculatedColumnParams;
  group_by: GroupByParams;
  join: JoinParams;
  split_column: SplitColumnParams;
  combine_columns: CombineColumnsParams;
  fill_nulls: FillNullsParams;
  drop_nulls: DropNullsParams;
}

export type TransformStep = {
  [K in StepType]: { stepType: K; params: StepParamsByType[K] };
}[StepType];

export interface TransformColumn {
  name: string;
  type: string;
}

export interface TransformationRecord {
  id: string;
  dataset_id: string;
  step_type: StepType;
  params_json: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
}

/** Conversión pura (sin acceso a BD) — segura de importar desde componentes cliente. */
export function toTransformStep(row: TransformationRecord): TransformStep {
  return { stepType: row.step_type, params: row.params_json } as unknown as TransformStep;
}
