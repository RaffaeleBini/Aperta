/**
 * Parser custom per il formato JSON-stat 2.0 (usato dalla API REST di
 * Eurostat). Non usiamo una libreria esterna: il formato è piccolo e ben
 * specificato, e il "roll-up"/filtro che offrirebbero le librerie esistenti
 * lo facciamo comunque via SQL una volta importati i dati in DuckDB.
 *
 * Riferimento formato: https://json-stat.org/format/
 */

interface JsonStatDimensionCategory {
  index?: Record<string, number> | string[];
  label?: Record<string, string>;
}

interface JsonStatDimension {
  label?: string;
  category?: JsonStatDimensionCategory;
}

interface JsonStatDataset {
  class?: string;
  id: string[];
  size: number[];
  dimension: Record<string, JsonStatDimension>;
  value: number[] | Record<string, number>;
}

export interface JsonStatRow {
  [column: string]: string | number | null;
}

export interface JsonStatParseResult {
  columns: string[];
  rows: JsonStatRow[];
}

interface DimensionCategories {
  id: string;
  /** codice/etichetta per ciascun indice di categoria, in ordine 0..size-1 */
  codes: string[];
  labels: string[];
}

function resolveCategoryOrder(
  category: JsonStatDimensionCategory | undefined
): { codes: string[]; labels: string[] } {
  const index = category?.index;
  const labelMap = category?.label ?? {};

  let codes: string[];
  if (Array.isArray(index)) {
    codes = index;
  } else if (index && typeof index === "object") {
    codes = Object.keys(index).sort((a, b) => index[a] - index[b]);
  } else {
    // Nessun indice esplicito: fallback sull'ordine delle label.
    codes = Object.keys(labelMap);
  }

  const labels = codes.map((code) => labelMap[code] ?? code);
  return { codes, labels };
}

export function parseJsonStatToRows(payload: JsonStatDataset): JsonStatParseResult {
  const { id: dimensionIds, size, dimension, value } = payload;

  if (!Array.isArray(dimensionIds) || !Array.isArray(size)) {
    throw new Error("Risposta JSON-stat non valida: mancano 'id' o 'size'.");
  }

  const dimensions: DimensionCategories[] = dimensionIds.map((dimId, i) => {
    const { codes, labels } = resolveCategoryOrder(dimension[dimId]?.category);
    if (codes.length !== size[i]) {
      throw new Error(
        `Dimensione "${dimId}": numero di categorie (${codes.length}) diverso da size dichiarata (${size[i]}).`
      );
    }
    return { id: dimId, codes, labels };
  });

  // Moltiplicatori per il calcolo dell'offset (JSON-stat: la prima dimensione
  // varia più velocemente). multiplier[0] = 1, multiplier[d] = multiplier[d-1] * size[d-1].
  const multipliers: number[] = [];
  let acc = 1;
  for (let d = 0; d < size.length; d++) {
    multipliers.push(acc);
    acc *= size[d];
  }
  const totalCells = acc;

  const isSparse = !Array.isArray(value);
  const getValue = (offset: number): number | null => {
    if (isSparse) {
      const v = (value as Record<string, number>)[String(offset)];
      return v === undefined ? null : v;
    }
    const v = (value as number[])[offset];
    return v === undefined ? null : v;
  };

  const columns: string[] = [];
  for (const dim of dimensions) {
    columns.push(dim.id);
    columns.push(`${dim.id}_label`);
  }
  columns.push("value");

  const rows: JsonStatRow[] = [];
  const indices = new Array(dimensions.length).fill(0);

  for (let offset = 0; offset < totalCells; offset++) {
    const v = getValue(offset);
    if (v !== null) {
      const row: JsonStatRow = {};
      dimensions.forEach((dim, d) => {
        row[dim.id] = dim.codes[indices[d]];
        row[`${dim.id}_label`] = dim.labels[indices[d]];
      });
      row.value = v;
      rows.push(row);
    }

    // Incrementa il contatore misto (prima dimensione più veloce).
    for (let d = 0; d < indices.length; d++) {
      indices[d]++;
      if (indices[d] < size[d]) break;
      indices[d] = 0;
    }
  }

  return { columns, rows };
}
