import { isNumericType } from "../duckdb/types";
import { isTemporalField } from "../charts/field-kind";
import { AGG_FUNCTIONS as AGG_FUNCTIONS_LIST } from "../sql/aggregations";
import { FILTER_OPS as FILTER_OPS_LIST } from "../sql/filters";
import { PIVOT_SHELVES } from "./pivot-shelves";
import type { PivotConfig } from "./types";

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

export function validatePivotConfig(config: PivotConfig, columns: DatasetColumn[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const columnsByName = new Map(columns.map((c) => [c.name, c]));

  for (const shelfName of ["rows", "columns"] as const) {
    const spec = PIVOT_SHELVES[shelfName];
    const fields = config[shelfName];
    if (fields.length < spec.min || fields.length > spec.max) {
      errors.push({
        path: shelfName,
        message: `"${shelfName}" admite entre ${spec.min} y ${spec.max} campo(s), recibidos ${fields.length}.`,
      });
      continue;
    }
    for (const f of fields) {
      const column = columnsByName.get(f.field);
      if (!column) {
        errors.push({ path: `${shelfName}.${f.field}`, message: `El campo "${f.field}" no existe en el dataset.` });
        continue;
      }
      if (f.dateGranularity) {
        if (!DATE_GRANULARITIES.has(f.dateGranularity)) {
          errors.push({ path: `${shelfName}.${f.field}`, message: `Granularidad de fecha desconocida: ${f.dateGranularity}.` });
        } else if (!isTemporalField(column.type)) {
          errors.push({ path: `${shelfName}.${f.field}`, message: `"${f.field}" no es un campo de fecha/hora.` });
        }
      }
    }
  }

  const valuesSpec = PIVOT_SHELVES.values;
  if (config.values.length < valuesSpec.min || config.values.length > valuesSpec.max) {
    errors.push({
      path: "values",
      message: `"values" admite entre ${valuesSpec.min} y ${valuesSpec.max} campo(s), recibidos ${config.values.length}.`,
    });
  } else {
    for (const v of config.values) {
      const column = columnsByName.get(v.field);
      if (!column) {
        errors.push({ path: `values.${v.field}`, message: `El campo "${v.field}" no existe en el dataset.` });
        continue;
      }
      if (!v.agg || !AGG_FUNCTIONS.has(v.agg)) {
        errors.push({ path: `values.${v.field}`, message: `"${v.field}" necesita una función de agregación válida.` });
      } else if (NUMERIC_ONLY_AGG.has(v.agg) && !isNumericType(column.type)) {
        errors.push({ path: `values.${v.field}`, message: `"${v.agg}" solo se puede aplicar a campos numéricos.` });
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
    if (filter.op === "is_null" || filter.op === "is_not_null") continue;
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
