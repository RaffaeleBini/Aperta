import type { PivotShelfName } from "./types";

export interface PivotShelfSpec {
  role: "dimension" | "measure";
  min: number;
  max: number;
}

/**
 * A diferencia de los gráficos (Fase 2), aquí solo hay un "tipo" de tabla
 * dinámica — el spec de shelves es fijo, no varía por configuración.
 */
export const PIVOT_SHELVES: Record<PivotShelfName, PivotShelfSpec> = {
  rows: { role: "dimension", min: 0, max: 5 },
  columns: { role: "dimension", min: 0, max: 3 },
  values: { role: "measure", min: 1, max: 5 },
};

export const PIVOT_SHELF_ORDER: PivotShelfName[] = ["rows", "columns", "values"];
