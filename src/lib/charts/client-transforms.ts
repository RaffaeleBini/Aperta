import type { BuiltChartQuery } from "./query-builder";

export interface SeriesInfo {
  key: string;
  label: string;
}

export interface PivotedSeries {
  data: Record<string, unknown>[];
  series: SeriesInfo[];
}

/**
 * Transforma las filas "long" devueltas por la query (una fila por x [+color])
 * en filas "wide" aptas para Recharts (una fila por x, una columna por serie),
 * cuando el gráfico tiene una dimensión "color" además de una o varias medidas
 * en "y". Sin "color", las columnas y/y_0../y_3 ya sirven directamente como series.
 */
export function pivotForCategorySeries(
  rows: Record<string, unknown>[],
  columnMap: BuiltChartQuery["columnMap"]
): PivotedSeries {
  const measureKeys = Object.entries(columnMap)
    .filter(([, c]) => c.shelf === "y" && c.role === "measure")
    .map(([key]) => key);
  const hasColor = "color" in columnMap;

  if (!hasColor) {
    const series = measureKeys.map((key) => ({ key, label: columnMap[key].field }));
    return { data: rows, series };
  }

  const byX = new Map<string, Record<string, unknown>>();
  const seriesKeys = new Set<string>();

  for (const row of rows) {
    const xVal = String(row.x ?? "");
    const colorVal = String(row.color ?? "");
    if (!byX.has(xVal)) byX.set(xVal, { x: row.x });
    const target = byX.get(xVal)!;

    for (const measureKey of measureKeys) {
      const seriesKey = measureKeys.length > 1 ? `${colorVal} — ${measureKey}` : colorVal;
      target[seriesKey] = row[measureKey];
      seriesKeys.add(seriesKey);
    }
  }

  const series = Array.from(seriesKeys).map((key) => ({ key, label: key }));
  return { data: Array.from(byX.values()), series };
}

export interface GroupedRows {
  key: string;
  label: string;
  rows: Record<string, unknown>[];
}

/** Agrupa filas por el valor de "color" (usado en scatter, sin pivotar). */
export function groupByColor(
  rows: Record<string, unknown>[],
  columnMap: BuiltChartQuery["columnMap"]
): GroupedRows[] {
  if (!("color" in columnMap)) {
    return [{ key: "default", label: "", rows }];
  }

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = String(row.color ?? "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.entries()).map(([key, groupRows]) => ({ key, label: key, rows: groupRows }));
}
