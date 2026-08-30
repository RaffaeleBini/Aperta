import type { DuckDBValue } from "@duckdb/node-api";

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

export const FILTER_OPS: FilterOp[] = [
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
];

export interface SqlFilter {
  field: string;
  op: FilterOp;
  value?: string | number | (string | number)[];
}

/**
 * Genera un fragmento WHERE parametrizado para un filtro. `paramKeyBase` debe
 * ser único dentro de la query completa que lo consuma (el llamador decide el
 * prefijo, p.ej. por índice de filtro o por posición de paso en un pipeline)
 * — los valores nunca se interpolan directamente en el SQL.
 */
export function buildFilterClause(
  filter: SqlFilter,
  paramKeyBase: string,
  params: Record<string, DuckDBValue>
): string {
  const col = `"${filter.field}"`;
  const paramKey = (suffix = "") => `${paramKeyBase}${suffix}`;

  switch (filter.op) {
    case "eq":
      params[paramKey()] = filter.value as DuckDBValue;
      return `${col} = $${paramKey()}`;
    case "neq":
      params[paramKey()] = filter.value as DuckDBValue;
      return `${col} != $${paramKey()}`;
    case "gt":
      params[paramKey()] = filter.value as DuckDBValue;
      return `${col} > $${paramKey()}`;
    case "gte":
      params[paramKey()] = filter.value as DuckDBValue;
      return `${col} >= $${paramKey()}`;
    case "lt":
      params[paramKey()] = filter.value as DuckDBValue;
      return `${col} < $${paramKey()}`;
    case "lte":
      params[paramKey()] = filter.value as DuckDBValue;
      return `${col} <= $${paramKey()}`;
    case "between": {
      const [lo, hi] = filter.value as [DuckDBValue, DuckDBValue];
      params[paramKey("a")] = lo;
      params[paramKey("b")] = hi;
      return `${col} BETWEEN $${paramKey("a")} AND $${paramKey("b")}`;
    }
    case "in":
    case "not_in": {
      const values = filter.value as DuckDBValue[];
      const placeholders = values.map((v, i) => {
        const key = paramKey(`_${i}`);
        params[key] = v;
        return `$${key}`;
      });
      return `${col} ${filter.op === "in" ? "IN" : "NOT IN"} (${placeholders.join(", ")})`;
    }
    case "is_null":
      return `${col} IS NULL`;
    case "is_not_null":
      return `${col} IS NOT NULL`;
    default:
      throw new Error(`Operador de filtro no soportado: ${filter.op}`);
  }
}
