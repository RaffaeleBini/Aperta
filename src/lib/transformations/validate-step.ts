import { isNumericType } from "../duckdb/types";
import { AGG_FUNCTIONS } from "../sql/aggregations";
import { FILTER_OPS } from "../sql/filters";
import { assertSafeExpression } from "./pipeline-builder";
import { DUCKDB_TYPE_WHITELIST, STEP_TYPES } from "./types";
import type { TransformColumn, TransformStep } from "./types";

const AGG_FUNCTIONS_SET = new Set<string>(AGG_FUNCTIONS);
const FILTER_OPS_SET = new Set<string>(FILTER_OPS);
const NUMERIC_ONLY_AGG = new Set(["sum", "avg"]);
const JOIN_TYPES = new Set(["inner", "left", "right", "full"]);

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validaciones estructurales/locales (sin tocar la base de datos). Errores
 * más profundos (p.ej. un dataset de join que no existe, una expresión SQL
 * sintácticamente inválida) los captura el intento real de construir/probar
 * la query en la mutación transaccional — ver `transformations.ts`.
 */
export function validateStep(
  step: TransformStep,
  availableColumns: TransformColumn[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const columnNames = new Set(availableColumns.map((c) => c.name));
  const columnsByName = new Map(availableColumns.map((c) => [c.name, c]));

  if (!STEP_TYPES.includes(step.stepType)) {
    return [{ path: "stepType", message: `Tipo de paso desconocido: ${step.stepType}` }];
  }

  const requireColumn = (name: string, path: string) => {
    if (!columnNames.has(name)) {
      errors.push({ path, message: `La columna "${name}" no existe en este punto.` });
    }
  };

  switch (step.stepType) {
    case "rename_column": {
      const { column, newName } = step.params;
      requireColumn(column, "column");
      if (!newName.trim()) errors.push({ path: "newName", message: "El nuevo nombre no puede estar vacío." });
      else if (newName !== column && columnNames.has(newName)) {
        errors.push({ path: "newName", message: `Ya existe una columna llamada "${newName}".` });
      }
      break;
    }

    case "drop_column":
      requireColumn(step.params.column, "column");
      break;

    case "change_type": {
      const { column, newType } = step.params;
      requireColumn(column, "column");
      if (!DUCKDB_TYPE_WHITELIST.includes(newType)) {
        errors.push({ path: "newType", message: `Tipo no soportado: ${newType}` });
      }
      break;
    }

    case "filter_rows": {
      if (step.params.filters.length === 0) {
        errors.push({ path: "filters", message: "Añade al menos un filtro." });
      }
      step.params.filters.forEach((f, i) => {
        requireColumn(f.field, `filters[${i}]`);
        if (!FILTER_OPS_SET.has(f.op)) {
          errors.push({ path: `filters[${i}]`, message: `Operador desconocido: ${f.op}` });
        }
      });
      break;
    }

    case "calculated_column": {
      const { name, expression } = step.params;
      if (!name.trim()) errors.push({ path: "name", message: "El nombre no puede estar vacío." });
      else if (columnNames.has(name)) {
        errors.push({ path: "name", message: `Ya existe una columna llamada "${name}".` });
      }
      if (!expression.trim()) {
        errors.push({ path: "expression", message: "La expresión no puede estar vacía." });
      } else {
        try {
          assertSafeExpression(expression);
        } catch (err) {
          errors.push({ path: "expression", message: (err as Error).message });
        }
      }
      break;
    }

    case "group_by": {
      const { groupColumns, aggregations } = step.params;
      groupColumns.forEach((gc, i) => requireColumn(gc, `groupColumns[${i}]`));
      if (aggregations.length === 0) {
        errors.push({ path: "aggregations", message: "Añade al menos una agregación." });
      }
      aggregations.forEach((a, i) => {
        requireColumn(a.column, `aggregations[${i}].column`);
        if (!AGG_FUNCTIONS_SET.has(a.fn)) {
          errors.push({ path: `aggregations[${i}].fn`, message: `Función desconocida: ${a.fn}` });
        } else if (NUMERIC_ONLY_AGG.has(a.fn)) {
          const col = columnsByName.get(a.column);
          if (col && col.type !== "UNKNOWN" && !isNumericType(col.type)) {
            errors.push({
              path: `aggregations[${i}].fn`,
              message: `"${a.fn}" solo se puede aplicar a campos numéricos.`,
            });
          }
        }
        if (!a.outputName.trim()) {
          errors.push({ path: `aggregations[${i}].outputName`, message: "El nombre de salida no puede estar vacío." });
        }
      });
      break;
    }

    case "join": {
      const { otherDatasetId, joinType, onLeft, onRight } = step.params;
      if (!otherDatasetId) errors.push({ path: "otherDatasetId", message: "Selecciona un dataset." });
      if (!JOIN_TYPES.has(joinType)) errors.push({ path: "joinType", message: `Tipo de unión desconocido: ${joinType}` });
      requireColumn(onLeft, "onLeft");
      if (!onRight.trim()) errors.push({ path: "onRight", message: "Selecciona la columna del otro dataset." });
      break;
    }

    case "split_column": {
      const { column, delimiter, outputNames } = step.params;
      requireColumn(column, "column");
      if (!delimiter) errors.push({ path: "delimiter", message: "El delimitador no puede estar vacío." });
      if (outputNames.length === 0) {
        errors.push({ path: "outputNames", message: "Indica al menos un nombre de columna de salida." });
      }
      outputNames.forEach((n, i) => {
        if (!n.trim()) errors.push({ path: `outputNames[${i}]`, message: "El nombre no puede estar vacío." });
        else if (columnNames.has(n)) errors.push({ path: `outputNames[${i}]`, message: `Ya existe una columna llamada "${n}".` });
      });
      break;
    }

    case "combine_columns": {
      const { columns, outputName } = step.params;
      if (columns.length < 2) {
        errors.push({ path: "columns", message: "Selecciona al menos dos columnas." });
      }
      columns.forEach((c, i) => requireColumn(c, `columns[${i}]`));
      if (!outputName.trim()) errors.push({ path: "outputName", message: "El nombre no puede estar vacío." });
      else if (columnNames.has(outputName)) {
        errors.push({ path: "outputName", message: `Ya existe una columna llamada "${outputName}".` });
      }
      break;
    }

    case "fill_nulls": {
      const { column, strategy, value } = step.params;
      requireColumn(column, "column");
      if (strategy === "value" && (value === undefined || value === "")) {
        errors.push({ path: "value", message: "Indica un valor de relleno." });
      }
      break;
    }

    case "drop_nulls": {
      if (step.params.columns.length === 0) {
        errors.push({ path: "columns", message: "Selecciona al menos una columna." });
      }
      step.params.columns.forEach((c, i) => requireColumn(c, `columns[${i}]`));
      break;
    }
  }

  return errors;
}
