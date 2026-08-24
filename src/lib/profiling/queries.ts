import { query } from "../duckdb/client";

const NULL_RATIO_ALERT_THRESHOLD = 0.2;
const NUMERIC_LIKE_ALERT_THRESHOLD = 0.9;
const TOP_CATEGORIES_LIMIT = 10;

export interface ColumnProfile {
  name: string;
  type: string;
  nullCount: number;
  emptyCount: number | null;
  distinctCount: number;
  min: unknown;
  max: unknown;
  avg: number | null;
  median: number | null;
  topCategories: { value: string; freq: number }[] | null;
  alerts: string[];
}

export interface DatasetProfile {
  rowCount: number;
  duplicateRowCount: number;
  columns: ColumnProfile[];
}

const NUMERIC_TYPES = new Set([
  "TINYINT",
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "HUGEINT",
  "UTINYINT",
  "USMALLINT",
  "UINTEGER",
  "UBIGINT",
  "FLOAT",
  "DOUBLE",
  "DECIMAL",
]);

function isNumericType(type: string): boolean {
  return NUMERIC_TYPES.has(type.split("(")[0].toUpperCase());
}

function isVarcharType(type: string): boolean {
  return type.toUpperCase().startsWith("VARCHAR");
}

async function profileColumn(
  tableName: string,
  column: { name: string; type: string },
  rowCount: number
): Promise<ColumnProfile> {
  const col = `"${column.name}"`;
  const numeric = isNumericType(column.type);
  const varchar = isVarcharType(column.type);

  const aggSelect = [
    `count(*) FILTER (WHERE ${col} IS NULL) AS null_count`,
    varchar ? `count(*) FILTER (WHERE ${col} = '') AS empty_count` : `NULL AS empty_count`,
    `approx_count_distinct(${col}) AS distinct_count`,
    `min(${col}) AS min_val`,
    `max(${col}) AS max_val`,
    numeric ? `avg(${col}) AS avg_val` : `NULL AS avg_val`,
    numeric ? `median(${col}) AS median_val` : `NULL AS median_val`,
    varchar
      ? `count(*) FILTER (WHERE try_cast(${col} AS DOUBLE) IS NOT NULL) AS numeric_like_count`
      : `NULL AS numeric_like_count`,
  ].join(",\n    ");

  const [agg] = await query<{
    null_count: number;
    empty_count: number | null;
    distinct_count: number;
    min_val: unknown;
    max_val: unknown;
    avg_val: number | null;
    median_val: number | null;
    numeric_like_count: number | null;
  }>(`SELECT ${aggSelect} FROM "${tableName}"`);

  let topCategories: { value: string; freq: number }[] | null = null;
  if (varchar) {
    topCategories = await query<{ value: string; freq: number }>(
      `SELECT ${col} AS value, count(*)::INTEGER AS freq FROM "${tableName}"
       WHERE ${col} IS NOT NULL
       GROUP BY ${col} ORDER BY freq DESC LIMIT ${TOP_CATEGORIES_LIMIT}`
    );
  }

  const alerts: string[] = [];
  const nullRatio = rowCount > 0 ? Number(agg.null_count) / rowCount : 0;
  if (nullRatio > NULL_RATIO_ALERT_THRESHOLD) {
    alerts.push("many_nulls");
  }
  if (
    varchar &&
    agg.numeric_like_count !== null &&
    rowCount > 0 &&
    Number(agg.numeric_like_count) / rowCount > NUMERIC_LIKE_ALERT_THRESHOLD
  ) {
    alerts.push("inconsistent_type_numeric");
  }

  return {
    name: column.name,
    type: column.type,
    nullCount: Number(agg.null_count),
    emptyCount: agg.empty_count === null ? null : Number(agg.empty_count),
    distinctCount: Number(agg.distinct_count),
    min: agg.min_val,
    max: agg.max_val,
    avg: agg.avg_val === null ? null : Number(agg.avg_val),
    median: agg.median_val === null ? null : Number(agg.median_val),
    topCategories,
    alerts,
  };
}

export async function profileDataset(
  tableName: string,
  columns: { name: string; type: string }[],
  rowCount: number
): Promise<DatasetProfile> {
  // GROUP BY ALL raggruppa sulle colonne non aggregate del SELECT: serve "*"
  // insieme a count(*) perché DuckDB abbia colonne su cui raggruppare.
  const [{ duplicate_row_count }] = await query<{ duplicate_row_count: number | null }>(
    `SELECT sum(c - 1)::INTEGER AS duplicate_row_count
     FROM (SELECT *, count(*) AS c FROM "${tableName}" GROUP BY ALL) t
     WHERE c > 1`
  );

  const profiledColumns = await Promise.all(
    columns.map((column) => profileColumn(tableName, column, rowCount))
  );

  return {
    rowCount,
    duplicateRowCount: duplicate_row_count === null ? 0 : Number(duplicate_row_count),
    columns: profiledColumns,
  };
}
