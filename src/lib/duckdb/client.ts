import path from "node:path";
import { mkdir } from "node:fs/promises";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import type { DuckDBValue } from "@duckdb/node-api";
import { ensureMigrated } from "./migrate";

const DB_PATH = path.join(process.cwd(), "data", "aperta.duckdb");

const globalForDuckDB = globalThis as unknown as {
  aperta_duckdb_conn?: Promise<DuckDBConnection>;
};

async function createConnection(): Promise<DuckDBConnection> {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  const instance = await DuckDBInstance.create(DB_PATH);
  const conn = await instance.connect();
  await ensureMigrated(conn);
  return conn;
}

export function getConnection(): Promise<DuckDBConnection> {
  if (!globalForDuckDB.aperta_duckdb_conn) {
    globalForDuckDB.aperta_duckdb_conn = createConnection();
  }
  return globalForDuckDB.aperta_duckdb_conn;
}

/** Esegue una query e restituisce le righe come oggetti JSON-safe. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  values?: DuckDBValue[] | Record<string, DuckDBValue>
): Promise<T[]> {
  const conn = await getConnection();
  const reader = await conn.runAndReadAll(sql, values);
  return reader.getRowObjectsJson() as T[];
}
