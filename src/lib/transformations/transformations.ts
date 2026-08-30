import { randomUUID } from "node:crypto";
import { getConnection, query } from "../duckdb/client";
import { getDataset, type DatasetRecord } from "../duckdb/datasets";
import { buildPipelineSql } from "./pipeline-builder";
import { toTransformStep } from "./types";
import type { StepType, TransformStep, TransformationRecord } from "./types";

export type { TransformationRecord } from "./types";
export { toTransformStep } from "./types";

function normalizeTransformation(row: TransformationRecord): TransformationRecord {
  return {
    ...row,
    position: Number(row.position),
    params_json:
      typeof row.params_json === "string" ? JSON.parse(row.params_json) : row.params_json,
  };
}

export async function listSteps(datasetId: string): Promise<TransformationRecord[]> {
  const rows = await query<TransformationRecord>(
    `SELECT * FROM transformations WHERE dataset_id = $datasetId ORDER BY position ASC`,
    { datasetId }
  );
  return rows.map(normalizeTransformation);
}

/**
 * Recomputa la tabla de trabajo a partir de la tabla raw + los pasos dados y
 * actualiza los metadatos de `datasets`. Si la cadena de pasos falla al
 * construirse/ejecutarse, lanza y NO modifica nada (ver Fase 3 del plan:
 * `CREATE OR REPLACE TABLE` es atómico ante fallo).
 */
async function recomputeWorkingTable(
  dataset: DatasetRecord,
  steps: TransformStep[]
): Promise<void> {
  const conn = await getConnection();

  if (steps.length === 0) {
    const rawColumns = await query<{ column_name: string; column_type: string }>(
      `DESCRIBE "${dataset.table_name}"`
    );
    const [{ row_count }] = await query<{ row_count: number }>(
      `SELECT count(*)::INTEGER AS row_count FROM "${dataset.table_name}"`
    );
    await conn.run(
      `UPDATE datasets SET working_table_name = NULL, schema_json = $schema, row_count = $rowCount, column_count = $colCount, updated_at = current_timestamp WHERE id = $id`,
      {
        id: dataset.id,
        schema: JSON.stringify(rawColumns.map((c) => ({ name: c.column_name, type: c.column_type }))),
        rowCount: row_count,
        colCount: rawColumns.length,
      }
    );
    return;
  }

  const built = await buildPipelineSql(dataset.table_name, steps);
  const workingTableName = dataset.working_table_name ?? `dsw_${randomUUID().replace(/-/g, "")}`;

  await conn.run(`CREATE OR REPLACE TABLE "${workingTableName}" AS ${built.sql}`, built.params);

  const schemaRows = await query<{ column_name: string; column_type: string }>(
    `DESCRIBE "${workingTableName}"`
  );
  const [{ row_count }] = await query<{ row_count: number }>(
    `SELECT count(*)::INTEGER AS row_count FROM "${workingTableName}"`
  );

  await conn.run(
    `UPDATE datasets SET working_table_name = $workingTableName, schema_json = $schema, row_count = $rowCount, column_count = $colCount, updated_at = current_timestamp WHERE id = $id`,
    {
      id: dataset.id,
      workingTableName,
      schema: JSON.stringify(schemaRows.map((c) => ({ name: c.column_name, type: c.column_type }))),
      rowCount: row_count,
      colCount: schemaRows.length,
    }
  );
}

async function requireDataset(datasetId: string): Promise<DatasetRecord> {
  const dataset = await getDataset(datasetId);
  if (!dataset) throw new Error("Dataset no encontrado.");
  return dataset;
}

export async function addStep(
  datasetId: string,
  stepType: StepType,
  params: Record<string, unknown>
): Promise<TransformationRecord[]> {
  const dataset = await requireDataset(datasetId);
  const currentSteps = await listSteps(datasetId);
  const newStep = { stepType, params } as unknown as TransformStep;
  const allSteps = [...currentSteps.map(toTransformStep), newStep];

  await recomputeWorkingTable(dataset, allSteps);

  const conn = await getConnection();
  await conn.run(
    `INSERT INTO transformations (dataset_id, step_type, params_json, position)
     VALUES ($datasetId, $stepType, $params, $position)`,
    {
      datasetId,
      stepType,
      params: JSON.stringify(params),
      position: currentSteps.length,
    }
  );

  return listSteps(datasetId);
}

export async function updateStep(
  datasetId: string,
  stepId: string,
  params: Record<string, unknown>
): Promise<TransformationRecord[]> {
  const dataset = await requireDataset(datasetId);
  const currentSteps = await listSteps(datasetId);
  const index = currentSteps.findIndex((s) => s.id === stepId);
  if (index === -1) throw new Error("Paso no encontrado.");

  const updatedSteps = currentSteps.map((s, i) => (i === index ? { ...s, params_json: params } : s));
  await recomputeWorkingTable(dataset, updatedSteps.map(toTransformStep));

  const conn = await getConnection();
  await conn.run(
    `UPDATE transformations SET params_json = $params, updated_at = current_timestamp WHERE id = $id`,
    { id: stepId, params: JSON.stringify(params) }
  );

  return listSteps(datasetId);
}

export async function deleteStep(datasetId: string, stepId: string): Promise<TransformationRecord[]> {
  const dataset = await requireDataset(datasetId);
  const currentSteps = await listSteps(datasetId);
  const remaining = currentSteps.filter((s) => s.id !== stepId);

  await recomputeWorkingTable(dataset, remaining.map(toTransformStep));

  const conn = await getConnection();
  await conn.run(`DELETE FROM transformations WHERE id = $id`, { id: stepId });
  await renumberPositions(remaining);

  return listSteps(datasetId);
}

export async function reorderSteps(
  datasetId: string,
  orderedStepIds: string[]
): Promise<TransformationRecord[]> {
  const dataset = await requireDataset(datasetId);
  const currentSteps = await listSteps(datasetId);
  const byId = new Map(currentSteps.map((s) => [s.id, s]));
  const reordered = orderedStepIds
    .map((id) => byId.get(id))
    .filter((s): s is TransformationRecord => Boolean(s));

  if (reordered.length !== currentSteps.length) {
    throw new Error("La lista de reordenación no coincide con los pasos existentes.");
  }

  await recomputeWorkingTable(dataset, reordered.map(toTransformStep));
  await renumberPositions(reordered);

  return listSteps(datasetId);
}

async function renumberPositions(steps: TransformationRecord[]): Promise<void> {
  const conn = await getConnection();
  for (let i = 0; i < steps.length; i++) {
    await conn.run(`UPDATE transformations SET position = $position WHERE id = $id`, {
      position: i,
      id: steps[i].id,
    });
  }
}
