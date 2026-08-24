import path from "node:path";
import { mkdir } from "node:fs/promises";
import { DuckDBInstance } from "@duckdb/node-api";
import { ensureMigrated } from "./migrate";

const DB_PATH = path.join(process.cwd(), "data", "aperta.duckdb");

async function main() {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  const instance = await DuckDBInstance.create(DB_PATH);
  const conn = await instance.connect();
  await ensureMigrated(conn);
  conn.closeSync();
  console.log(`Migrazioni applicate su ${DB_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
