import { isNumericType } from "../duckdb/types";
import { isTemporalField } from "./field-kind";
import { CHART_TYPE_SHELVES, CHART_TYPES } from "./chart-types";
import { AGG_FUNCTIONS as AGG_FUNCTIONS_LIST } from "../sql/aggregations";
import { FILTER_OPS as FILTER_OPS_LIST } from "../sql/filters";
import type { ChartConfig, ShelfName } from "./types";

const AGG_FUNCTIONS = new Set<string>(AGG_FUNCTIONS_LIST);
const NUMERIC_ONLY_AGG = new Set(["sum", "avg"]);
const DATE_GRANULARITIES = new Set(["year", "quarter", "month", "day"]);
const FILTER_OPS = new Set<string>(FILTER_OPS_LIST);

export interface ValidationError {
  path: string;
  message: string;
}

export interface DatasetColumn {
  name: string;
  type: string;
}

export function validateChartConfig(
  config: ChartConfig,
  columns: DatasetColumn[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const columnsByName = new Map(columns.map((c) => [c.name, c]));

  if (!CHART_TYPES.includes(config.chartType)) {
    errors.push({ path: "chartType", message: `Tipo de gráfico desconocido: ${config.chartType}` });
    return errors;
  }

  const spec = CHART_TYPE_SHELVES[config.chartType];
  const allowedShelves = new Set(Object.keys(spec) as ShelfName[]);

  for (const shelfName of Object.keys(config.shelves) as ShelfName[]) {
    if (!allowedShelves.has(shelfName)) {
      errors.push({
        path: `shelves.${shelfName}`,
        message: `La shelf "${shelfName}" no es válida para el tipo "${config.chartType}".`,
      });
    }
  }

  for (const shelfName of allowedShelves) {
    const shelfSpec = spec[shelfName]!;
    const fields = config.shelves[shelfName] ?? [];

    if (fields.length < shelfSpec.min || fields.length > shelfSpec.max) {
      errors.push({
        path: `shelves.${shelfName}`,
        message: `"${shelfName}" requiere entre ${shelfSpec.min} y ${shelfSpec.max} campo(s), recibidos ${fields.length}.`,
      });
      continue;
    }

    for (const shelfField of fields) {
      const column = columnsByName.get(shelfField.field);
      if (!column) {
        errors.push({
          path: `shelves.${shelfName}.${shelfField.field}`,
          message: `El campo "${shelfField.field}" no existe en el dataset.`,
        });
        continue;
      }

      if (shelfSpec.role === "measure") {
        if (!shelfField.agg || !AGG_FUNCTIONS.has(shelfField.agg)) {
          errors.push({
            path: `shelves.${shelfName}.${shelfField.field}`,
            message: `"${shelfField.field}" necesita una función de agregación válida.`,
          });
        } else if (NUMERIC_ONLY_AGG.has(shelfField.agg) && !isNumericType(column.type)) {
          errors.push({
            path: `shelves.${shelfName}.${shelfField.field}`,
            message: `"${shelfField.agg}" solo se puede aplicar a campos numéricos.`,
          });
        }
      } else if (shelfField.agg) {
        errors.push({
          path: `shelves.${shelfName}.${shelfField.field}`,
          message: `"${shelfField.field}" es una dimensión, no debe tener función de agregación.`,
        });
      }

      if (shelfField.dateGranularity) {
        if (!DATE_GRANULARITIES.has(shelfField.dateGranularity)) {
          errors.push({
            path: `shelves.${shelfName}.${shelfField.field}`,
            message: `Granularidad de fecha desconocida: ${shelfField.dateGranularity}.`,
          });
        } else if (!isTemporalField(column.type)) {
          errors.push({
            path: `shelves.${shelfName}.${shelfField.field}`,
            message: `"${shelfField.field}" no es un campo de fecha/hora.`,
          });
        }
      }
    }
  }

  for (const [i, filter] of config.filters.entries()) {
    const column = columnsByName.get(filter.field);
    if (!column) {
      errors.push({ path: `filters[${i}]`, message: `Campo de filtro desconocido: "${filter.field}".` });
      continue;
    }
    if (!FILTER_OPS.has(filter.op)) {
      errors.push({ path: `filters[${i}]`, message: `Operador de filtro desconocido: "${filter.op}".` });
      continue;
    }
    if (filter.op === "is_null" || filter.op === "is_not_null") {
      continue;
    }
    if (filter.value === undefined) {
      errors.push({ path: `filters[${i}]`, message: `El filtro sobre "${filter.field}" necesita un valor.` });
    } else if (filter.op === "between" && (!Array.isArray(filter.value) || filter.value.length !== 2)) {
      errors.push({ path: `filters[${i}]`, message: `"between" necesita exactamente dos valores.` });
    } else if ((filter.op === "in" || filter.op === "not_in") && !Array.isArray(filter.value)) {
      errors.push({ path: `filters[${i}]`, message: `"${filter.op}" necesita una lista de valores.` });
    }
  }

  return errors;
}
