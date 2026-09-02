import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import type { DuckDBValue } from "@duckdb/node-api";
import { ensureMigrated } from "./migrate";

const DB_PATH = path.join(process.cwd(), "data", "aperta.duckdb");
const WAL_PATH = `${DB_PATH}.wal`;

const globalForDuckDB = globalThis as unknown as {
  aperta_duckdb_conn?: Promise<DuckDBConnection>;
};

/**
 * Volumi di rete (osservato su Railway) possono lasciare il file .wal in uno
 * stato che DuckDB non riesce a riprodurre dopo un riavvio non pulito del
 * container — errore interno "Failure while replaying WAL file". È la
 * procedura di recupero documentata da DuckDB stesso: eliminare il .wal
 * (si perdono solo le transazioni non ancora sottoposte a checkpoint) e
 * riaprire. Senza questo, un singolo WAL corrotto blocca l'app per sempre,
 * a ogni tentativo di riavvio incluso quello automatico di Railway.
 */
async function createConnection(): Promise<DuckDBConnection> {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  let instance: DuckDBInstance;
  try {
    instance = await DuckDBInstance.create(DB_PATH);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("replaying WAL file")) throw err;
    console.error(
      `[duckdb] WAL corrotto, recupero eliminando ${WAL_PATH} (transazioni non checkpointate perse):`,
      message
    );
    await unlink(WAL_PATH).catch(() => {});
    instance = await DuckDBInstance.create(DB_PATH);
  }
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
