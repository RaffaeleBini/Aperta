import { assembleNotebook, markdownCell, codeCell, type NotebookCell } from "./cells";
import { buildChartPlotCode } from "./chart-plot-code";
import { pyParamsDict, pySqlTripleQuote, pyStringLiteral } from "./py-literal";
import { buildPipelineSql } from "../transformations/pipeline-builder";
import { summarizeStep } from "../transformations/step-summary";
import { toTransformStep } from "../transformations/types";
import type { TransformStep, TransformationRecord } from "../transformations/types";
import { buildChartQuery } from "../charts/query-builder";
import type { ChartRecord } from "../charts/charts";
import { buildPivotQuery } from "../pivot/query-builder";
import type { PivotRecord } from "../pivot/pivots";
import { rowsToCsv } from "../csv";
import { query } from "../duckdb/client";
import { effectiveTableName, getDataset, type DatasetRecord } from "../duckdb/datasets";

const SNAPSHOT_ROW_LIMIT = 200_000;

const STEP_SUMMARY_TEMPLATES: Record<string, (v: Record<string, string | number>) => string> = {
  rename_column: (v) => `Renombrar "${v.column}" → "${v.newName}"`,
  drop_column: (v) => `Eliminar columna "${v.column}"`,
  change_type: (v) => `Cambiar tipo de "${v.column}" a ${v.newType}`,
  filter_rows: (v) => `Filtrar filas (${v.count} condición/es)`,
  calculated_column: (v) => `Columna calculada "${v.name}"`,
  group_by: (v) => `Agrupar por ${v.columns}`,
  join: () => `Unir con otro dataset`,
  split_column: (v) => `Dividir "${v.column}"`,
  combine_columns: (v) => `Combinar columnas → "${v.outputName}"`,
  fill_nulls: (v) => `Rellenar nulos en "${v.column}"`,
  drop_nulls: (v) => `Eliminar filas con nulos en ${v.columns}`,
};

function stepSummaryText(step: TransformStep): string {
  const { key, values } = summarizeStep(step);
  return STEP_SUMMARY_TEMPLATES[key](values);
}

function sanitizeIdent(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export interface SnapshotFile {
  filename: string;
  content: string;
}

async function snapshotTableCsv(
  tableName: string,
  filename: string
): Promise<{ file: SnapshotFile; truncated: boolean }> {
  const columnRows = await query<{ column_name: string }>(`DESCRIBE "${tableName}"`);
  const columns = columnRows.map((c) => c.column_name);
  const rows = await query(`SELECT * FROM "${tableName}" LIMIT ${SNAPSHOT_ROW_LIMIT + 1}`);
  const truncated = rows.length > SNAPSHOT_ROW_LIMIT;
  const finalRows = truncated ? rows.slice(0, SNAPSHOT_ROW_LIMIT) : rows;
  return { file: { filename, content: rowsToCsv(columns, finalRows) }, truncated };
}

function truncationNote(truncated: boolean): string {
  if (!truncated) return "";
  const limit = SNAPSHOT_ROW_LIMIT.toLocaleString("es-ES");
  return `\n\n> ⚠️ El dataset supera las ${limit} filas — se ha truncado a las primeras ${limit} para mantener el tamaño de descarga razonable.`;
}

export type NotebookTarget =
  | { kind: "chart"; chart: ChartRecord }
  | { kind: "pivot"; pivot: PivotRecord };

export interface NotebookExportResult {
  files: SnapshotFile[];
  zipBaseName: string;
}

export async function buildNotebookExport(
  dataset: DatasetRecord,
  transformations: TransformationRecord[],
  target: NotebookTarget
): Promise<NotebookExportResult> {
  const steps = transformations.map(toTransformStep);
  const cells: NotebookCell[] = [];
  const files: SnapshotFile[] = [];

  const title = target.kind === "chart" ? target.chart.name : target.pivot.name;
  cells.push(
    markdownCell(`# ${title}\n\nExportado desde Aperta a partir del dataset **${dataset.name}**.`)
  );

  const needsPlot = target.kind === "chart";
  cells.push(
    codeCell(
      [
        "import duckdb",
        "import pandas as pd",
        ...(needsPlot ? ["import matplotlib.pyplot as plt"] : []),
        "",
        "con = duckdb.connect()",
      ].join("\n")
    )
  );

  const primaryFilename = "dataset.csv";
  const { file: primaryFile, truncated: primaryTruncated } = await snapshotTableCsv(
    dataset.table_name,
    primaryFilename
  );
  files.push(primaryFile);
  cells.push(
    markdownCell(
      `## Carga de datos\n\nSnapshot de "${dataset.name}" tal como se importó originalmente (tabla \`${dataset.table_name}\`).${truncationNote(primaryTruncated)}`
    )
  );
  cells.push(
    codeCell(
      [
        `df_raw = pd.read_csv(${pyStringLiteral(primaryFilename)})`,
        `con.register(${pyStringLiteral(dataset.table_name)}, df_raw)`,
        "df_raw.head()",
      ].join("\n")
    )
  );

  const joinDatasetIds = new Set(
    steps.filter((s) => s.stepType === "join").map((s) => s.params.otherDatasetId)
  );
  for (const otherId of joinDatasetIds) {
    const otherDataset = await getDataset(otherId);
    if (!otherDataset) continue;
    const otherTable = effectiveTableName(otherDataset);
    const auxFilename = `join_${sanitizeIdent(otherDataset.id)}.csv`;
    const { file: auxFile, truncated: auxTruncated } = await snapshotTableCsv(otherTable, auxFilename);
    files.push(auxFile);
    const dfVar = `df_join_${sanitizeIdent(otherDataset.id)}`;
    cells.push(
      markdownCell(
        `### Dataset auxiliar: ${otherDataset.name}\n\nUsado en un paso de unión (\`join\`).${truncationNote(auxTruncated)}`
      )
    );
    cells.push(
      codeCell(
        [
          `${dfVar} = pd.read_csv(${pyStringLiteral(auxFilename)})`,
          `con.register(${pyStringLiteral(otherTable)}, ${dfVar})`,
        ].join("\n")
      )
    );
  }

  let lastDfVar = "df_raw";
  for (let i = 0; i < steps.length; i++) {
    const built = await buildPipelineSql(dataset.table_name, steps, { upToPosition: i + 1 });
    const dfVar = `df_step_${i + 1}`;
    cells.push(markdownCell(`### Paso ${i + 1}: ${stepSummaryText(steps[i])}`));
    cells.push(
      codeCell(
        [
          `sql_${i + 1} = ${pySqlTripleQuote(built.sql)}`,
          `params_${i + 1} = ${pyParamsDict(built.params as Record<string, unknown>)}`,
          `${dfVar} = con.execute(sql_${i + 1}, params_${i + 1}).df()`,
          `${dfVar}.head()`,
        ].join("\n")
      )
    );
    lastDfVar = dfVar;
  }

  const workingTableName = effectiveTableName(dataset);
  if (steps.length > 0) {
    cells.push(
      markdownCell(
        `### Tabla de trabajo actual\n\nSe registra el resultado del último paso bajo el mismo nombre que usa la app internamente, para poder ejecutar sin cambios la consulta del gráfico/tabla dinámica.`
      )
    );
    cells.push(codeCell(`con.register(${pyStringLiteral(workingTableName)}, ${lastDfVar})`));
  }

  if (target.kind === "chart") {
    const chartQuery = buildChartQuery(workingTableName, target.chart.config_json);
    cells.push(markdownCell(`## Gráfico: ${target.chart.name}`));
    cells.push(
      codeCell(
        [
          `sql_chart = ${pySqlTripleQuote(chartQuery.sql)}`,
          `params_chart = ${pyParamsDict(chartQuery.params as Record<string, unknown>)}`,
          `df_chart = con.execute(sql_chart, params_chart).df()`,
          `df_chart.head()`,
        ].join("\n")
      )
    );
    cells.push(
      codeCell(
        buildChartPlotCode(target.chart.chart_type, chartQuery.columnMap, target.chart.config_json.options)
      )
    );
  } else {
    const pivotQuery = buildPivotQuery(workingTableName, target.pivot.config_json);
    cells.push(markdownCell(`## Tabla dinámica: ${target.pivot.name}`));
    cells.push(
      codeCell(
        [
          `sql_pivot = ${pySqlTripleQuote(pivotQuery.sql)}`,
          `params_pivot = ${pyParamsDict(pivotQuery.params as Record<string, unknown>)}`,
          `df_pivot = con.execute(sql_pivot, params_pivot).df()`,
          `df_pivot`,
        ].join("\n")
      )
    );
  }

  files.push({ filename: "notebook.ipynb", content: assembleNotebook(cells) });

  const zipBaseName = title.replace(/[^a-zA-Z0-9_-]/g, "_") || "notebook";
  return { files, zipBaseName };
}
