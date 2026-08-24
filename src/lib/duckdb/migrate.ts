import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DuckDBConnection } from "@duckdb/node-api";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

export async function ensureMigrated(conn: DuckDBConnection) {
  await conn.run(`
    CREATE TABLE IF NOT EXISTS _aperta_migrations (
      id INTEGER PRIMARY KEY,
      filename VARCHAR NOT NULL,
      applied_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

  const applied = await conn.runAndReadAll(
    "SELECT filename FROM _aperta_migrations"
  );
  const appliedFilenames = new Set(
    applied.getRowObjectsJson().map((row) => row.filename as string)
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    if (appliedFilenames.has(filename)) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, filename), "utf-8");
    const id = Number.parseInt(filename.slice(0, 4), 10);

    await conn.run(sql);
    await conn.run(
      "INSERT INTO _aperta_migrations (id, filename) VALUES ($id, $filename)",
      { id, filename }
    );
  }
}
