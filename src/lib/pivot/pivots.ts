import { getConnection, query } from "../duckdb/client";
import type { PivotConfig } from "./types";

export interface PivotRecord {
  id: string;
  dataset_id: string;
  name: string;
  config_json: PivotConfig;
  created_at: string;
  updated_at: string;
}

export interface CreatePivotInput {
  datasetId: string;
  name: string;
  config: PivotConfig;
}

function normalizePivot(row: PivotRecord): PivotRecord {
  return {
    ...row,
    config_json: typeof row.config_json === "string" ? JSON.parse(row.config_json) : row.config_json,
  };
}

export async function createPivot(input: CreatePivotInput): Promise<PivotRecord> {
  const [row] = await query<PivotRecord>(
    `INSERT INTO pivots (dataset_id, name, config_json)
     VALUES ($datasetId, $name, $configJson)
     RETURNING *`,
    {
      datasetId: input.datasetId,
      name: input.name,
      configJson: JSON.stringify(input.config),
    }
  );
  return normalizePivot(row);
}

export async function updatePivot(
  id: string,
  input: { name?: string; config?: PivotConfig }
): Promise<PivotRecord | null> {
  const conn = await getConnection();
  await conn.run(
    `UPDATE pivots SET
       name = COALESCE($name, name),
       config_json = COALESCE($configJson, config_json),
       updated_at = current_timestamp
     WHERE id = $id`,
    {
      id,
      name: input.name ?? null,
      configJson: input.config ? JSON.stringify(input.config) : null,
    }
  );
  return getPivot(id);
}

export async function listPivotsByDataset(datasetId: string): Promise<PivotRecord[]> {
  const rows = await query<PivotRecord>(
    `SELECT * FROM pivots WHERE dataset_id = $datasetId ORDER BY updated_at DESC`,
    { datasetId }
  );
  return rows.map(normalizePivot);
}

export async function getPivot(id: string): Promise<PivotRecord | null> {
  const rows = await query<PivotRecord>(`SELECT * FROM pivots WHERE id = $id`, { id });
  return rows[0] ? normalizePivot(rows[0]) : null;
}

export async function deletePivot(id: string): Promise<void> {
  const conn = await getConnection();
  await conn.run(`DELETE FROM pivots WHERE id = $id`, { id });
}
