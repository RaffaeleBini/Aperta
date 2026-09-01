import { z } from "zod";

const aggFnSchema = z.enum(["sum", "avg", "count", "count_distinct", "min", "max"]);
const dateGranularitySchema = z.enum(["year", "quarter", "month", "day"]);
const filterOpSchema = z.enum([
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
]);

const pivotFieldSchema = z.object({
  field: z.string().min(1),
  dateGranularity: dateGranularitySchema.optional(),
});

const pivotValueFieldSchema = z.object({
  field: z.string().min(1),
  agg: aggFnSchema,
  label: z.string().optional(),
});

const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.union([z.string(), z.number()])),
]);

const pivotFilterSchema = z.object({
  field: z.string().min(1),
  op: filterOpSchema,
  value: filterValueSchema.optional(),
});

export const pivotConfigSchema = z.object({
  version: z.literal(1),
  rows: z.array(pivotFieldSchema),
  columns: z.array(pivotFieldSchema),
  values: z.array(pivotValueFieldSchema),
  filters: z.array(pivotFilterSchema),
});

export const createPivotSchema = z.object({
  name: z.string().min(1),
  config: pivotConfigSchema,
});

export const updatePivotSchema = z.object({
  name: z.string().min(1).optional(),
  config: pivotConfigSchema.optional(),
});

export const previewPivotSchema = pivotConfigSchema;
