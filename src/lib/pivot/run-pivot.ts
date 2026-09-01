import { query } from "../duckdb/client";
import { buildPivotQuery } from "./query-builder";
import type { PivotConfig } from "./types";

const MAX_PIVOT_COLUMNS = 300;

export class PivotTooLargeError extends Error {}

export interface PivotResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

/**
 * Orquesta la ejecución de una tabla dinámica: en modo "pivoted" comprueba
 * antes la cardinalidad del shelf `columns` para evitar generar cientos de
 * columnas SQL con un campo de alta cardinalidad, y solo entonces ejecuta el
 * PIVOT real.
 */
export async function runPivotQuery(
  tableName: string,
  config: PivotConfig,
  opts?: { limit?: number }
): Promise<PivotResult> {
  const built = buildPivotQuery(tableName, config);

  if (built.mode === "pivoted") {
    const [{ n }] = await query<{ n: number | string }>(built.cardinalitySql!, built.cardinalityParams);
    const distinctCount = Number(n);
    if (distinctCount * config.values.length > MAX_PIVOT_COLUMNS) {
      throw new PivotTooLargeError(
        `La combinación de campos en "Columnas" generaría demasiadas columnas (${distinctCount * config.values.length}). Añade más filtros o quita algún campo.`
      );
    }
  }

  const sql = opts?.limit ? `${built.sql} LIMIT ${opts.limit}` : built.sql;
  const rows = await query(sql, built.params);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { columns, rows };
}
