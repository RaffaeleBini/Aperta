import type { DuckDBValue } from "@duckdb/node-api";
import { query } from "../duckdb/client";
import { effectiveTableName, getDataset } from "../duckdb/datasets";
import { AGG_SQL } from "../sql/aggregations";
import { buildFilterClause } from "../sql/filters";
import { DUCKDB_TYPE_WHITELIST } from "./types";
import type { TransformStep, TransformColumn } from "./types";

const DENYLIST_PATTERN =
  /\b(DROP|ATTACH|DETACH|COPY|PRAGMA|CREATE|ALTER|INSERT|UPDATE|DELETE|CALL|EXPORT|IMPORT|INSTALL|LOAD|SET)\b/i;

const JOIN_SQL: Record<string, string> = {
  inner: "INNER",
  left: "LEFT",
  right: "RIGHT",
  full: "FULL OUTER",
};

/** Mitigación de lista negra para la expresión libre de "columna calculada". No es una sandbox perfecta. */
export function assertSafeExpression(expression: string): void {
  if (expression.includes(";")) {
    throw new Error('La expresión no puede contener ";".');
  }
  if (DENYLIST_PATTERN.test(expression)) {
    throw new Error("La expresión contiene una palabra clave no permitida.");
  }
}

function quote(name: string): string {
  return `"${name}"`;
}

async function describeTable(tableName: string): Promise<TransformColumn[]> {
  const rows = await query<{ column_name: string; column_type: string }>(
    `DESCRIBE ${quote(tableName)}`
  );
  return rows.map((r) => ({ name: r.column_name, type: r.column_type }));
}

interface StepSqlResult {
  selectSql: string;
  columns: TransformColumn[];
}

async function applyStep(
  prevCte: string,
  prevColumns: TransformColumn[],
  step: TransformStep,
  stepKey: string,
  params: Record<string, DuckDBValue>
): Promise<StepSqlResult> {
  switch (step.stepType) {
    case "rename_column": {
      const { column, newName } = step.params;
      return {
        selectSql: `SELECT * EXCLUDE (${quote(column)}), ${quote(column)} AS ${quote(newName)} FROM ${prevCte}`,
        columns: prevColumns.map((c) => (c.name === column ? { ...c, name: newName } : c)),
      };
    }

    case "drop_column": {
      const { column } = step.params;
      return {
        selectSql: `SELECT * EXCLUDE (${quote(column)}) FROM ${prevCte}`,
        columns: prevColumns.filter((c) => c.name !== column),
      };
    }

    case "change_type": {
      const { column, newType } = step.params;
      if (!DUCKDB_TYPE_WHITELIST.includes(newType)) {
        throw new Error(`Tipo de destino no soportado: ${newType}`);
      }
      return {
        selectSql: `SELECT * EXCLUDE (${quote(column)}), TRY_CAST(${quote(column)} AS ${newType}) AS ${quote(column)} FROM ${prevCte}`,
        columns: prevColumns.map((c) => (c.name === column ? { ...c, type: newType } : c)),
      };
    }

    case "filter_rows": {
      const clauses = step.params.filters.map((f, i) =>
        buildFilterClause(f, `${stepKey}_f${i}`, params)
      );
      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      return {
        selectSql: `SELECT * FROM ${prevCte} ${where}`,
        columns: prevColumns,
      };
    }

    case "calculated_column": {
      const { name, expression } = step.params;
      assertSafeExpression(expression);
      return {
        selectSql: `SELECT *, (${expression}) AS ${quote(name)} FROM ${prevCte}`,
        columns: [...prevColumns, { name, type: "UNKNOWN" }],
      };
    }

    case "group_by": {
      const { groupColumns, aggregations } = step.params;
      const aggExprs = aggregations.map(
        (a) => `${AGG_SQL[a.fn](quote(a.column))} AS ${quote(a.outputName)}`
      );
      const selectList = [...groupColumns.map(quote), ...aggExprs].join(", ");
      const groupBy = groupColumns.length > 0 ? "GROUP BY ALL" : "";
      return {
        selectSql: `SELECT ${selectList} FROM ${prevCte} ${groupBy}`,
        columns: [
          ...groupColumns.map(
            (gc) => prevColumns.find((c) => c.name === gc) ?? { name: gc, type: "UNKNOWN" }
          ),
          ...aggregations.map((a) => ({ name: a.outputName, type: "UNKNOWN" })),
        ],
      };
    }

    case "join": {
      const { otherDatasetId, joinType, onLeft, onRight } = step.params;
      const otherDataset = await getDataset(otherDatasetId);
      if (!otherDataset) {
        throw new Error(`Dataset a unir no encontrado: ${otherDatasetId}`);
      }
      const otherTable = effectiveTableName(otherDataset);
      const rightColumns = await describeTable(otherTable);
      const leftNames = new Set(prevColumns.map((c) => c.name));

      const rightSelect = rightColumns.map((c) => {
        const alias = leftNames.has(c.name) ? `${c.name}_right` : c.name;
        return `r.${quote(c.name)} AS ${quote(alias)}`;
      });
      const joinKeyword = JOIN_SQL[joinType] ?? "INNER";

      return {
        selectSql: `SELECT l.*, ${rightSelect.join(", ")} FROM ${prevCte} l ${joinKeyword} JOIN ${quote(otherTable)} r ON l.${quote(onLeft)} = r.${quote(onRight)}`,
        columns: [
          ...prevColumns,
          ...rightColumns.map((c) => ({
            name: leftNames.has(c.name) ? `${c.name}_right` : c.name,
            type: c.type,
          })),
        ],
      };
    }

    case "split_column": {
      const { column, delimiter, outputNames } = step.params;
      const delimKey = `${stepKey}_delim`;
      params[delimKey] = delimiter;
      const exprs = outputNames.map(
        (name, i) => `split_part(${quote(column)}, $${delimKey}, ${i + 1}) AS ${quote(name)}`
      );
      return {
        selectSql: `SELECT *, ${exprs.join(", ")} FROM ${prevCte}`,
        columns: [...prevColumns, ...outputNames.map((n) => ({ name: n, type: "VARCHAR" }))],
      };
    }

    case "combine_columns": {
      const { columns, separator, outputName, dropOriginals } = step.params;
      const sepKey = `${stepKey}_sep`;
      params[sepKey] = separator;
      const exclude = dropOriginals ? `* EXCLUDE (${columns.map(quote).join(", ")})` : "*";
      const combineExpr = `concat_ws($${sepKey}, ${columns.map(quote).join(", ")}) AS ${quote(outputName)}`;
      return {
        selectSql: `SELECT ${exclude}, ${combineExpr} FROM ${prevCte}`,
        columns: [
          ...(dropOriginals ? prevColumns.filter((c) => !columns.includes(c.name)) : prevColumns),
          { name: outputName, type: "VARCHAR" },
        ],
      };
    }

    case "fill_nulls": {
      const { column, strategy, value } = step.params;
      let expr: string;
      if (strategy === "mean") expr = `AVG(${quote(column)}) OVER ()`;
      else if (strategy === "median") expr = `MEDIAN(${quote(column)}) OVER ()`;
      else if (strategy === "mode") expr = `MODE(${quote(column)}) OVER ()`;
      else if (strategy === "zero") expr = "0";
      else {
        const valueKey = `${stepKey}_val`;
        params[valueKey] = value ?? null;
        expr = `$${valueKey}`;
      }
      return {
        selectSql: `SELECT * EXCLUDE (${quote(column)}), COALESCE(${quote(column)}, ${expr}) AS ${quote(column)} FROM ${prevCte}`,
        columns: prevColumns,
      };
    }

    case "drop_nulls": {
      const clauses = step.params.columns.map((c) => `${quote(c)} IS NOT NULL`);
      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      return {
        selectSql: `SELECT * FROM ${prevCte} ${where}`,
        columns: prevColumns,
      };
    }
  }
}

export interface PipelineResult {
  sql: string;
  params: Record<string, DuckDBValue>;
  columns: TransformColumn[];
}

export interface BuildPipelineOptions {
  /** Trunca la cadena de pasos guardados a los primeros N (por defecto, todos). */
  upToPosition?: number;
  /** Añade un paso adicional no persistido encima del prefijo resultante. */
  draftStep?: TransformStep;
}

/**
 * Compone la cadena completa de CTEs a partir de la tabla raw + los pasos
 * guardados (opcionalmente truncados) + un posible paso en borrador. Sirve
 * tanto para recomputar la tabla de trabajo tras confirmar un cambio como
 * para el preview en vivo mientras se configura un paso nuevo.
 */
export async function buildPipelineSql(
  rawTableName: string,
  steps: TransformStep[],
  opts: BuildPipelineOptions = {}
): Promise<PipelineResult> {
  const baseSteps = steps.slice(0, opts.upToPosition ?? steps.length);
  const allSteps = opts.draftStep ? [...baseSteps, opts.draftStep] : baseSteps;

  let currentColumns = await describeTable(rawTableName);
  const params: Record<string, DuckDBValue> = {};
  const ctes: string[] = [`step_0 AS (SELECT * FROM ${quote(rawTableName)})`];
  let prevCte = "step_0";

  for (let i = 0; i < allSteps.length; i++) {
    const stepKey = `s${i}`;
    const { selectSql, columns } = await applyStep(
      prevCte,
      currentColumns,
      allSteps[i],
      stepKey,
      params
    );
    const cteName = `step_${i + 1}`;
    ctes.push(`${cteName} AS (${selectSql})`);
    prevCte = cteName;
    currentColumns = columns;
  }

  const sql = `WITH ${ctes.join(",\n     ")}\nSELECT * FROM ${prevCte}`;
  return { sql, params, columns: currentColumns };
}
