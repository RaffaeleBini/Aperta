import { z } from "zod";

export const genericSourceSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  authBasic: z
    .object({ username: z.string(), password: z.string() })
    .optional(),
  format: z.enum(["auto", "json", "csv"]).optional(),
});

export const genericImportSchema = genericSourceSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const eurostatSourceSchema = z.object({
  datasetCode: z.string().min(1),
  lang: z.string().optional(),
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
});

export const eurostatImportSchema = eurostatSourceSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
});
