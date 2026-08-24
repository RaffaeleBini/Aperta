import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getConnection, query } from "../duckdb/client";
import { ingestFileIntoTable, type IngestResult, type IngestFormat } from "../duckdb/ingest";

const TMP_DIR = path.join(process.cwd(), "data", "tmp");
const FETCH_TIMEOUT_MS = 90_000;
// Chiavi comuni sotto cui le API REST annidano l'array di righe (Socrata/CKAN-like).
const CANDIDATE_ARRAY_KEYS = ["data", "results", "items", "records", "features", "value"];

export interface GenericSourceConfig {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  authBasic?: { username: string; password: string };
  format?: "auto" | "json" | "csv";
}

function buildUrl(config: GenericSourceConfig): string {
  const url = new URL(config.url);
  for (const [key, value] of Object.entries(config.queryParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchSource(
  config: GenericSourceConfig
): Promise<{ format: IngestFormat; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const headers = new Headers(config.headers ?? {});
  if (config.authBasic) {
    const token = Buffer.from(
      `${config.authBasic.username}:${config.authBasic.password}`
    ).toString("base64");
    headers.set("Authorization", `Basic ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(config), {
      method: config.method ?? "GET",
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`La sorgente ha risposto ${res.status} (${config.url}).`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  let format: IngestFormat;
  if (config.format === "json" || config.format === "csv") {
    format = config.format;
  } else if (contentType.includes("json")) {
    format = "json";
  } else if (contentType.includes("csv")) {
    format = "csv";
  } else {
    const trimmed = text.trimStart();
    format = trimmed.startsWith("[") || trimmed.startsWith("{") ? "json" : "csv";
  }

  return { format, text };
}

function extractJsonArray(text: string): unknown[] {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of CANDIDATE_ARRAY_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value;
    }
  }

  throw new Error(
    "Non è stato possibile individuare un array di oggetti nella risposta JSON."
  );
}

async function writeTempFile(
  config: GenericSourceConfig
): Promise<{ path: string; format: IngestFormat }> {
  const { format, text } = await fetchSource(config);
  await mkdir(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `${randomUUID()}.${format}`);

  if (format === "json") {
    const rows = extractJsonArray(text);
    await writeFile(tmpPath, rows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
  } else {
    await writeFile(tmpPath, text, "utf-8");
  }

  return { path: tmpPath, format };
}

export interface GenericColumn {
  name: string;
  type: string;
}

export interface GenericPreview {
  columns: GenericColumn[];
  preview: Record<string, unknown>[];
  totalRows: number;
}

export async function previewGenericSource(
  config: GenericSourceConfig
): Promise<GenericPreview> {
  const { path: tmpPath, format } = await writeTempFile(config);
  try {
    const reader = format === "csv" ? "read_csv_auto" : "read_json_auto";
    const conn = await getConnection();

    const describeReader = await conn.runAndReadAll(
      `DESCRIBE SELECT * FROM ${reader}($path)`,
      { path: tmpPath }
    );
    const columns = describeReader
      .getRowObjectsJson()
      .map((r) => ({
        name: r.column_name as string,
        type: r.column_type as string,
      }));

    const preview = await query(`SELECT * FROM ${reader}($path) LIMIT 50`, {
      path: tmpPath,
    });
    const [{ total }] = await query<{ total: number }>(
      `SELECT count(*) AS total FROM ${reader}($path)`,
      { path: tmpPath }
    );

    return { columns, preview, totalRows: Number(total) };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function importGenericSource(
  config: GenericSourceConfig
): Promise<IngestResult> {
  const { path: tmpPath, format } = await writeTempFile(config);
  try {
    return await ingestFileIntoTable(tmpPath, format);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
