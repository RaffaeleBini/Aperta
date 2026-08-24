import { randomUUID } from "node:crypto";
import { getConnection, query } from "./client";

export type IngestFormat = "csv" | "json";

export interface IngestColumn {
  name: string;
  type: string;
}

export interface IngestResult {
  tableName: string;
  rowCount: number;
  columns: IngestColumn[];
}

export function generateTableName(): string {
  return `ds_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Crea una tabella DuckDB a partire da un file CSV/JSON su disco, delegando
 * tipizzazione e parsing a read_csv_auto/read_json_auto. Path unico condiviso
 * da tutti i connettori (generico, Eurostat, upload di file).
 */
export async function ingestFileIntoTable(
  filePath: string,
  format: IngestFormat,
  tableName: string = generateTableName()
): Promise<IngestResult> {
  const conn = await getConnection();

  const reader = format === "csv" ? "read_csv_auto" : "read_json_auto";
  await conn.run(
    `CREATE TABLE "${tableName}" AS SELECT * FROM ${reader}($path)`,
    { path: filePath }
  );

  const columns = await query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = $table ORDER BY ordinal_position`,
    { table: tableName }
  );

  const [{ row_count: rowCount }] = await query<{ row_count: number }>(
    `SELECT count(*)::INTEGER AS row_count FROM "${tableName}"`
  );

  return {
    tableName,
    rowCount,
    columns: columns.map((c) => ({ name: c.column_name, type: c.data_type })),
  };
}
