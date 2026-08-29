import { isNumericType, isTemporalType } from "../duckdb/types";

export type FieldKind = "dimension" | "measure";

/**
 * Clasifica una columna del dataset como dimensión (agrupable, sin agregar) o
 * medida (numérica, requiere función de agregación). Usado tanto en el
 * cliente (agrupar field-list.tsx) como en el servidor (validate-config.ts) —
 * debe ser el único punto de verdad para que la clasificación no diverja.
 */
export function classifyField(type: string): FieldKind {
  return isNumericType(type) ? "measure" : "dimension";
}

export function isTemporalField(type: string): boolean {
  return isTemporalType(type);
}
