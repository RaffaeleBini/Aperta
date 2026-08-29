import { getConnection, query } from "../duckdb/client";
import type { ChartConfig, ChartType } from "./types";

export interface ChartRecord {
  id: string;
  dataset_id: string;
  name: string;
  chart_type: ChartType;
  config_json: ChartConfig;
  created_at: string;
  updated_at: string;
}

export interface CreateChartInput {
  datasetId: string;
  name: string;
  chartType: ChartType;
  config: ChartConfig;
}

function normalizeChart(row: ChartRecord): ChartRecord {
  return {
    ...row,
    config_json:
      typeof row.config_json === "string" ? JSON.parse(row.config_json) : row.config_json,
  };
}

export async function createChart(input: CreateChartInput): Promise<ChartRecord> {
  const [row] = await query<ChartRecord>(
    `INSERT INTO charts (dataset_id, name, chart_type, config_json)
     VALUES ($datasetId, $name, $chartType, $configJson)
     RETURNING *`,
    {
      datasetId: input.datasetId,
      name: input.name,
      chartType: input.chartType,
      configJson: JSON.stringify(input.config),
    }
  );
  return normalizeChart(row);
}

export async function updateChart(
  id: string,
  input: { name?: string; chartType?: ChartType; config?: ChartConfig }
): Promise<ChartRecord | null> {
  const conn = await getConnection();
  await conn.run(
    `UPDATE charts SET
       name = COALESCE($name, name),
       chart_type = COALESCE($chartType, chart_type),
       config_json = COALESCE($configJson, config_json),
       updated_at = current_timestamp
     WHERE id = $id`,
    {
      id,
      name: input.name ?? null,
      chartType: input.chartType ?? null,
      configJson: input.config ? JSON.stringify(input.config) : null,
    }
  );
  return getChart(id);
}

export async function listChartsByDataset(datasetId: string): Promise<ChartRecord[]> {
  const rows = await query<ChartRecord>(
    `SELECT * FROM charts WHERE dataset_id = $datasetId ORDER BY updated_at DESC`,
    { datasetId }
  );
  return rows.map(normalizeChart);
}

export async function getChart(id: string): Promise<ChartRecord | null> {
  const rows = await query<ChartRecord>(`SELECT * FROM charts WHERE id = $id`, { id });
  return rows[0] ? normalizeChart(rows[0]) : null;
}

export async function deleteChart(id: string): Promise<void> {
  const conn = await getConnection();
  await conn.run(`DELETE FROM charts WHERE id = $id`, { id });
}
