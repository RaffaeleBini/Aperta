import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import type { DuckDBValue } from "@duckdb/node-api";
import { ensureMigrated } from "./migrate";

const DB_PATH = path.join(process.cwd(), "data", "aperta.duckdb");
const WAL_PATH = `${DB_PATH}.wal`;

const globalForDuckDB = globalThis as unknown as {
  aperta_duckdb_conn?: Promise<DuckDBConnection>;
  aperta_shutdown_registered?: boolean;
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
    // Se il connect fallisce senza recupero possibile, non tenere in cache
    // una promise rifiutata per sempre — un prossimo tentativo riprova da zero.
    globalForDuckDB.aperta_duckdb_conn.catch(() => {
      globalForDuckDB.aperta_duckdb_conn = undefined;
    });
  }
  return globalForDuckDB.aperta_duckdb_conn;
}

/**
 * Piattaforme come Railway inviano SIGTERM prima di uccidere il container ad
 * ogni redeploy. Senza un checkpoint esplicito qui, ogni redeploy lascia un
 * .wal non consolidato che va rigiocato al prossimo avvio — nella maggior
 * parte dei casi va bene, ma è proprio la finestra in cui si è osservato in
 * produzione un fallimento di replay del WAL (vedi createConnection sopra).
 * Un CHECKPOINT pulito qui riduce drasticamente quella finestra di rischio.
 */
async function shutdown() {
  const pending = globalForDuckDB.aperta_duckdb_conn;
  if (!pending) return;
  try {
    const conn = await pending;
    await conn.run("CHECKPOINT");
    conn.closeSync();
  } catch {
    // Uscita in corso comunque: un checkpoint fallito qui non deve bloccarla.
  }
}

if (!globalForDuckDB.aperta_shutdown_registered) {
  globalForDuckDB.aperta_shutdown_registered = true;
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
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
