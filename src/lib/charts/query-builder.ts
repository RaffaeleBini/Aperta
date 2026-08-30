import type { DuckDBValue } from "@duckdb/node-api";
import { CHART_TYPE_SHELVES } from "./chart-types";
import type { ChartConfig, ShelfName } from "./types";
import { AGG_SQL } from "../sql/aggregations";
import { buildFilterClause } from "../sql/filters";

const DATE_GRANULARITIES = new Set(["year", "quarter", "month", "day"]);

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

// Ordinal fijo de shelves para que el SELECT (y por tanto GROUP BY ALL) sea determinista.
const SHELF_ORDER: ShelfName[] = ["x", "y", "color", "size", "group"];

function aliasFor(shelfName: ShelfName, index: number, count: number): string {
  return count > 1 ? `${shelfName}_${index}` : shelfName;
}

function dimensionExpr(field: string, dateGranularity?: string): string {
  const col = `"${field}"`;
  if (!dateGranularity) return col;
  if (!DATE_GRANULARITIES.has(dateGranularity)) {
    throw new Error(`Granularidad de fecha no soportada: ${dateGranularity}`);
  }
  return `date_trunc('${dateGranularity}', ${col})`;
}

export interface BuiltChartQuery {
  sql: string;
  params: Record<string, DuckDBValue>;
  /** Alias de columna -> { shelf, field } para que el cliente sepa interpretar las filas devueltas. */
  columnMap: Record<string, { shelf: ShelfName; field: string; role: "dimension" | "measure" }>;
}

export function buildChartQuery(
  tableName: string,
  config: ChartConfig
): BuiltChartQuery {
  const spec = CHART_TYPE_SHELVES[config.chartType];
  const selectParts: string[] = [];
  const columnMap: BuiltChartQuery["columnMap"] = {};

  for (const shelfName of SHELF_ORDER) {
    const shelfSpec = spec[shelfName];
    const fields = config.shelves[shelfName];
    if (!shelfSpec || !fields || fields.length === 0) continue;

    fields.forEach((shelfField, i) => {
      const alias = aliasFor(shelfName, i, fields.length);
      const expr =
        shelfSpec.role === "dimension"
          ? dimensionExpr(shelfField.field, shelfField.dateGranularity)
          : AGG_SQL[shelfField.agg!](`"${shelfField.field}"`);
      selectParts.push(`${expr} AS "${alias}"`);
      columnMap[alias] = { shelf: shelfName, field: shelfField.field, role: shelfSpec.role };
    });
  }

  if (selectParts.length === 0) {
    throw new Error("El gráfico no tiene ningún campo asignado.");
  }

  const params: Record<string, DuckDBValue> = {};
  const whereClauses = config.filters.map((filter, i) => buildFilterClause(filter, `f${i}`, params));
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, config.options?.limit ?? DEFAULT_LIMIT)
  );

  const orderSql = buildOrderClause(config, columnMap);

  const sql = `
    SELECT ${selectParts.join(",\n           ")}
    FROM "${tableName}"
    ${whereSql}
    GROUP BY ALL
    ${orderSql}
    LIMIT ${limit}
  `.trim();

  return { sql, params, columnMap };
}

function buildOrderClause(
  config: ChartConfig,
  columnMap: BuiltChartQuery["columnMap"]
): string {
  const sortX = config.options?.sortX ?? "asc";
  if (sortX === "none") return "";

  if (sortX === "value_desc") {
    const firstMeasureAlias = Object.entries(columnMap).find(([, c]) => c.role === "measure")?.[0];
    return firstMeasureAlias ? `ORDER BY "${firstMeasureAlias}" DESC` : "";
  }

  const hasX = "x" in columnMap ? "x" : Object.keys(columnMap).find((k) => columnMap[k].role === "dimension");
  if (!hasX) return "";
  return `ORDER BY "${hasX}" ${sortX === "desc" ? "DESC" : "ASC"}`;
}
