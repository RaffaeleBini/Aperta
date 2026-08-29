import { z } from "zod";

const chartTypeSchema = z.enum(["bar", "line", "area", "scatter", "pie", "heatmap"]);
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

const shelfFieldSchema = z.object({
  field: z.string().min(1),
  agg: aggFnSchema.optional(),
  label: z.string().optional(),
  dateGranularity: dateGranularitySchema.optional(),
});

const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.union([z.string(), z.number()])),
]);

const chartFilterSchema = z.object({
  field: z.string().min(1),
  op: filterOpSchema,
  value: filterValueSchema.optional(),
});

export const chartConfigSchema = z.object({
  version: z.literal(1),
  chartType: chartTypeSchema,
  shelves: z.object({
    x: z.array(shelfFieldSchema).optional(),
    y: z.array(shelfFieldSchema).optional(),
    color: z.array(shelfFieldSchema).optional(),
    size: z.array(shelfFieldSchema).optional(),
    group: z.array(shelfFieldSchema).optional(),
  }),
  filters: z.array(chartFilterSchema),
  options: z
    .object({
      stacked: z.boolean().optional(),
      donut: z.boolean().optional(),
      sortX: z.enum(["asc", "desc", "value_desc", "none"]).optional(),
      limit: z.number().optional(),
    })
    .optional(),
});

export const createChartSchema = z.object({
  name: z.string().min(1),
  chartType: chartTypeSchema,
  config: chartConfigSchema,
});

export const updateChartSchema = z.object({
  name: z.string().min(1).optional(),
  chartType: chartTypeSchema.optional(),
  config: chartConfigSchema.optional(),
});
