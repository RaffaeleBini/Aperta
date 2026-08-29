import { CHART_TYPE_SHELVES } from "./chart-types";
import type { ChartConfig, ChartType, ShelfName } from "./types";

export interface RemapResult {
  shelves: ChartConfig["shelves"];
  droppedFields: { shelf: ShelfName; field: string }[];
}

/**
 * Al cambiar de tipo de gráfico, conserva los campos en shelves cuyo rol
 * (dimensión/medida) coincide en ambos tipos; descarta el resto y los
 * reporta para poder avisar al usuario (toast) en vez de un reset silencioso.
 */
export function remapShelvesForType(
  fromType: ChartType,
  toType: ChartType,
  shelves: ChartConfig["shelves"]
): RemapResult {
  const fromSpec = CHART_TYPE_SHELVES[fromType];
  const toSpec = CHART_TYPE_SHELVES[toType];
  const nextShelves: ChartConfig["shelves"] = {};
  const droppedFields: { shelf: ShelfName; field: string }[] = [];

  for (const shelfName of Object.keys(shelves) as ShelfName[]) {
    const fields = shelves[shelfName] ?? [];
    const toShelfSpec = toSpec[shelfName];
    const fromShelfSpec = fromSpec[shelfName];

    if (!toShelfSpec || !fromShelfSpec || toShelfSpec.role !== fromShelfSpec.role) {
      fields.forEach((f) => droppedFields.push({ shelf: shelfName, field: f.field }));
      continue;
    }

    const kept = fields.slice(0, toShelfSpec.max);
    if (kept.length > 0) nextShelves[shelfName] = kept;
    fields.slice(toShelfSpec.max).forEach((f) => droppedFields.push({ shelf: shelfName, field: f.field }));
  }

  return { shelves: nextShelves, droppedFields };
}
