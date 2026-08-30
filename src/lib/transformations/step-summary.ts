import type { TransformStep } from "./types";

export interface StepSummary {
  key: string;
  values: Record<string, string | number>;
}

/** Datos estructurados para renderizar un resumen de una línea por paso vía i18n (namespace `transform.summary`). */
export function summarizeStep(step: TransformStep): StepSummary {
  switch (step.stepType) {
    case "rename_column":
      return { key: "rename_column", values: { column: step.params.column, newName: step.params.newName } };
    case "drop_column":
      return { key: "drop_column", values: { column: step.params.column } };
    case "change_type":
      return { key: "change_type", values: { column: step.params.column, newType: step.params.newType } };
    case "filter_rows":
      return { key: "filter_rows", values: { count: step.params.filters.length } };
    case "calculated_column":
      return { key: "calculated_column", values: { name: step.params.name } };
    case "group_by":
      return {
        key: "group_by",
        values: { columns: step.params.groupColumns.join(", ") || "—" },
      };
    case "join":
      return { key: "join", values: {} };
    case "split_column":
      return { key: "split_column", values: { column: step.params.column } };
    case "combine_columns":
      return { key: "combine_columns", values: { outputName: step.params.outputName } };
    case "fill_nulls":
      return { key: "fill_nulls", values: { column: step.params.column } };
    case "drop_nulls":
      return { key: "drop_nulls", values: { columns: step.params.columns.join(", ") } };
  }
}
