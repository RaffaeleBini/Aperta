export type AggFn = "sum" | "avg" | "count" | "count_distinct" | "min" | "max";

export const AGG_FUNCTIONS: AggFn[] = ["sum", "avg", "count", "count_distinct", "min", "max"];

/** Mapa fijo función -> fragmento SQL: nunca se interpola `agg` como string libre. */
export const AGG_SQL: Record<AggFn, (col: string) => string> = {
  sum: (c) => `sum(${c})`,
  avg: (c) => `avg(${c})`,
  count: (c) => `count(${c})`,
  count_distinct: (c) => `count(DISTINCT ${c})`,
  min: (c) => `min(${c})`,
  max: (c) => `max(${c})`,
};
