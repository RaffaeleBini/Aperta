import { z } from "zod";
import type { StepType } from "./types";

const sqlFilterSchema = z.object({
  field: z.string().min(1),
  op: z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
    "not_in",
    "is_null",
    "is_not_null",
  ]),
  value: z
    .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
    .optional(),
});

const aggFnSchema = z.enum(["sum", "avg", "count", "count_distinct", "min", "max"]);
const duckDbTypeSchema = z.enum(["VARCHAR", "INTEGER", "BIGINT", "DOUBLE", "DATE", "TIMESTAMP", "BOOLEAN"]);

const renameColumnSchema = z.object({ column: z.string().min(1), newName: z.string().min(1) });
const dropColumnSchema = z.object({ column: z.string().min(1) });
const changeTypeSchema = z.object({ column: z.string().min(1), newType: duckDbTypeSchema });
const filterRowsSchema = z.object({ filters: z.array(sqlFilterSchema).min(1) });
const calculatedColumnSchema = z.object({ name: z.string().min(1), expression: z.string().min(1) });
const groupBySchema = z.object({
  groupColumns: z.array(z.string().min(1)),
  aggregations: z
    .array(z.object({ column: z.string().min(1), fn: aggFnSchema, outputName: z.string().min(1) }))
    .min(1),
});
const joinSchema = z.object({
  otherDatasetId: z.string().min(1),
  joinType: z.enum(["inner", "left", "right", "full"]),
  onLeft: z.string().min(1),
  onRight: z.string().min(1),
});
const splitColumnSchema = z.object({
  column: z.string().min(1),
  delimiter: z.string().min(1),
  outputNames: z.array(z.string().min(1)).min(1),
});
const combineColumnsSchema = z.object({
  columns: z.array(z.string().min(1)).min(2),
  separator: z.string(),
  outputName: z.string().min(1),
  dropOriginals: z.boolean().optional(),
});
const fillNullsSchema = z.object({
  column: z.string().min(1),
  strategy: z.enum(["value", "mean", "median", "mode", "zero"]),
  value: z.string().optional(),
});
const dropNullsSchema = z.object({ columns: z.array(z.string().min(1)).min(1) });

export const paramsSchemaByStepType: Record<StepType, z.ZodTypeAny> = {
  rename_column: renameColumnSchema,
  drop_column: dropColumnSchema,
  change_type: changeTypeSchema,
  filter_rows: filterRowsSchema,
  calculated_column: calculatedColumnSchema,
  group_by: groupBySchema,
  join: joinSchema,
  split_column: splitColumnSchema,
  combine_columns: combineColumnsSchema,
  fill_nulls: fillNullsSchema,
  drop_nulls: dropNullsSchema,
};

export const transformStepSchema = z.discriminatedUnion("stepType", [
  z.object({ stepType: z.literal("rename_column"), params: renameColumnSchema }),
  z.object({ stepType: z.literal("drop_column"), params: dropColumnSchema }),
  z.object({ stepType: z.literal("change_type"), params: changeTypeSchema }),
  z.object({ stepType: z.literal("filter_rows"), params: filterRowsSchema }),
  z.object({ stepType: z.literal("calculated_column"), params: calculatedColumnSchema }),
  z.object({ stepType: z.literal("group_by"), params: groupBySchema }),
  z.object({ stepType: z.literal("join"), params: joinSchema }),
  z.object({ stepType: z.literal("split_column"), params: splitColumnSchema }),
  z.object({ stepType: z.literal("combine_columns"), params: combineColumnsSchema }),
  z.object({ stepType: z.literal("fill_nulls"), params: fillNullsSchema }),
  z.object({ stepType: z.literal("drop_nulls"), params: dropNullsSchema }),
]);

export const updateStepSchema = z.object({
  params: z.record(z.string(), z.unknown()),
});

export const previewTransformSchema = z.object({
  upToPosition: z.number().int().min(0).optional(),
  draftStep: transformStepSchema.optional(),
});

export const reorderStepsSchema = z.object({
  orderedStepIds: z.array(z.string().min(1)),
});
