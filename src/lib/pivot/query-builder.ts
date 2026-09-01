import type { DuckDBValue } from "@duckdb/node-api";
import { AGG_SQL } from "../sql/aggregations";
import { buildFilterClause } from "../sql/filters";
import type { PivotConfig, PivotField } from "./types";

const DATE_GRANULARITIES = new Set(["year", "quarter", "month", "day"]);

function dimensionExpr(field: string, dateGranularity?: string): string {
  const col = `"${field}"`;
  if (!dateGranularity) return col;
  if (!DATE_GRANULARITIES.has(dateGranularity)) {
    throw new Error(`Granularidad de fecha no soportada: ${dateGranularity}`);
  }
  return `date_trunc('${dateGranularity}', ${col})`;
}

function aliasList(fields: PivotField[], prefix: string): string[] {
  return fields.map((_, i) => `${prefix}${i}`);
}

export interface BuiltPivotQuery {
  sql: string;
  params: Record<string, DuckDBValue>;
  mode: "grouped" | "pivoted";
  /** Solo presente en modo "pivoted": cuenta las combinaciones distintas del shelf `columns` antes de ejecutar el PIVOT real. */
  cardinalitySql?: string;
  cardinalityParams?: Record<string, DuckDBValue>;
}

/**
 * Construye la consulta de una tabla dinámica. Sin campos en `columns` es un
 * simple GROUP BY ALL (modo "grouped", igual que un gráfico de barras); con
 * campos en `columns` usa la sentencia PIVOT nativa de DuckDB (modo
 * "pivoted"), que esparce los valores distintos de esos campos en columnas.
 *
 * El subquery interno selecciona *solo* las columnas necesarias (filas +
 * columnas + valores) — nunca `SELECT *` — porque PIVOT agrupa
 * implícitamente por cualquier columna no usada en ON/USING, lo que rompería
 * el caso "sin filas" (un pivot puro debe colapsar a una sola fila).
 */
export function buildPivotQuery(tableName: string, config: PivotConfig): BuiltPivotQuery {
  if (config.values.length === 0) {
    throw new Error("La tabla dinámica necesita al menos un campo de valores.");
  }

  const rowAliases = aliasList(config.rows, "r");
  const colAliases = aliasList(config.columns, "c");

  const params: Record<string, DuckDBValue> = {};
  const whereClauses = config.filters.map((filter, i) => buildFilterClause(filter, `f${i}`, params));
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const valueFields = [...new Set(config.values.map((v) => v.field))];
  const innerSelectParts = [
    ...config.rows.map((f, i) => `${dimensionExpr(f.field, f.dateGranularity)} AS "${rowAliases[i]}"`),
    ...config.columns.map((f, i) => `${dimensionExpr(f.field, f.dateGranularity)} AS "${colAliases[i]}"`),
    ...valueFields.map((f) => `"${f}"`),
  ];
  const innerSql = `SELECT ${innerSelectParts.join(", ")} FROM "${tableName}" ${whereSql}`;

  const usingExprs = config.values.map((v, i) => {
    const alias = v.label ?? `v${i}`;
    return `${AGG_SQL[v.agg](`"${v.field}"`)} AS "${alias}"`;
  });

  const rowCols = rowAliases.map((a) => `"${a}"`);

  if (config.columns.length === 0) {
    const selectParts = [...rowCols, ...usingExprs];
    const groupBy = rowCols.length > 0 ? "GROUP BY ALL" : "";
    const orderBy = rowCols.length > 0 ? `ORDER BY ${rowCols.join(", ")}` : "";
    const sql = `SELECT ${selectParts.join(", ")} FROM (${innerSql}) pivot_src ${groupBy} ${orderBy}`.trim();
    return { sql, params, mode: "grouped" };
  }

  const onExprs = colAliases.map((a) => `"${a}"`).join(", ");
  const groupBy = rowCols.length > 0 ? `GROUP BY ${rowCols.join(", ")}` : "";
  const orderBy = rowCols.length > 0 ? `ORDER BY ${rowCols.join(", ")}` : "";
  const sql = `PIVOT (${innerSql}) ON ${onExprs} USING ${usingExprs.join(", ")} ${groupBy} ${orderBy}`.trim();

  const cardinalitySql = `SELECT count(DISTINCT (${onExprs})) AS n FROM (${innerSql}) pivot_card`;

  return { sql, params, mode: "pivoted", cardinalitySql, cardinalityParams: { ...params } };
}
