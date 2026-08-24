import { getConnection, query } from "./client";
import type { IngestColumn } from "./ingest";

export interface DatasetRecord {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  data_source_id: string | null;
  table_name: string;
  row_count: number;
  column_count: number;
  schema_json: IngestColumn[];
  raw_origin_json: Record<string, unknown> | null;
  imported_at: string;
  updated_at: string;
}

export interface CreateDatasetInput {
  name: string;
  description?: string;
  sourceType: "file_csv" | "file_json" | "file_excel" | "api_generic" | "api_eurostat";
  dataSourceId?: string;
  tableName: string;
  rowCount: number;
  columns: IngestColumn[];
  rawOrigin?: Record<string, unknown>;
}

export async function createDatasetRecord(input: CreateDatasetInput): Promise<DatasetRecord> {
  const conn = await getConnection();
  await conn.run(
    `INSERT INTO datasets
       (name, description, source_type, data_source_id, table_name, row_count, column_count, schema_json, raw_origin_json)
     VALUES ($name, $description, $sourceType, $dataSourceId, $tableName, $rowCount, $columnCount, $schemaJson, $rawOriginJson)`,
    {
      name: input.name,
      description: input.description ?? null,
      sourceType: input.sourceType,
      dataSourceId: input.dataSourceId ?? null,
      tableName: input.tableName,
      rowCount: input.rowCount,
      columnCount: input.columns.length,
      schemaJson: JSON.stringify(input.columns),
      rawOriginJson: input.rawOrigin ? JSON.stringify(input.rawOrigin) : null,
    }
  );

  const [record] = await query<DatasetRecord>(
    `SELECT * FROM datasets WHERE table_name = $tableName`,
    { tableName: input.tableName }
  );
  return normalizeDataset(record);
}

function normalizeDataset(row: DatasetRecord): DatasetRecord {
  return {
    ...row,
    row_count: Number(row.row_count),
    column_count: Number(row.column_count),
    schema_json:
      typeof row.schema_json === "string" ? JSON.parse(row.schema_json) : row.schema_json,
    raw_origin_json:
      typeof row.raw_origin_json === "string"
        ? JSON.parse(row.raw_origin_json)
        : row.raw_origin_json,
  };
}

export async function listDatasets(): Promise<DatasetRecord[]> {
  const rows = await query<DatasetRecord>(
    `SELECT * FROM datasets ORDER BY imported_at DESC`
  );
  return rows.map(normalizeDataset);
}

export async function getDataset(id: string): Promise<DatasetRecord | null> {
  const rows = await query<DatasetRecord>(`SELECT * FROM datasets WHERE id = $id`, { id });
  return rows[0] ? normalizeDataset(rows[0]) : null;
}

const SORTABLE_DIRECTIONS = new Set(["asc", "desc"]);

export interface PaginatedRows {
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  totalRows: number;
}

export async function getDatasetRows(
  dataset: DatasetRecord,
  opts: { page?: number; pageSize?: number; sort?: string; dir?: string }
): Promise<PaginatedRows> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, opts.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const validColumns = new Set(dataset.schema_json.map((c) => c.name));
  const sort = opts.sort && validColumns.has(opts.sort) ? opts.sort : null;
  const dir = SORTABLE_DIRECTIONS.has((opts.dir ?? "").toLowerCase())
    ? opts.dir!.toUpperCase()
    : "ASC";

  const orderClause = sort ? `ORDER BY "${sort}" ${dir}` : "";
  const rows = await query(
    `SELECT * FROM "${dataset.table_name}" ${orderClause} LIMIT ${pageSize} OFFSET ${offset}`
  );

  return { rows, page, pageSize, totalRows: dataset.row_count };
}
