import type { ChartType, ShelfName } from "./types";
import type { FieldKind } from "./field-kind";

export interface ShelfSpec {
  /** Rol que cumple el campo en esta shelf: dimensión (GROUP BY) o medida (agregada). */
  role: FieldKind;
  min: number;
  max: number;
}

function dim(min: number, max: number): ShelfSpec {
  return { role: "dimension", min, max };
}

function measure(min: number, max: number): ShelfSpec {
  return { role: "measure", min, max };
}

export const CHART_TYPES: ChartType[] = ["bar", "line", "area", "scatter", "pie", "heatmap"];

/**
 * Define, por tipo de gráfico, qué shelves existen y qué rol cumplen
 * (dimensión vs. medida) — el mismo config_json se interpreta distinto según
 * el chartType. P.ej. en heatmap "color" es una medida agregada, mientras que
 * en bar/line/area es una dimensión opcional (series).
 */
export const CHART_TYPE_SHELVES: Record<ChartType, Partial<Record<ShelfName, ShelfSpec>>> = {
  bar: { x: dim(1, 1), y: measure(1, 4), color: dim(0, 1) },
  line: { x: dim(1, 1), y: measure(1, 4), color: dim(0, 1) },
  area: { x: dim(1, 1), y: measure(1, 4), color: dim(0, 1) },
  scatter: { x: measure(1, 1), y: measure(1, 1), color: dim(0, 1), size: measure(0, 1), group: dim(1, 1) },
  pie: { color: dim(1, 1), y: measure(1, 1) },
  heatmap: { x: dim(1, 1), y: dim(1, 1), color: measure(1, 1) },
};

export function shelvesForType(chartType: ChartType): ShelfName[] {
  return Object.keys(CHART_TYPE_SHELVES[chartType]) as ShelfName[];
}
