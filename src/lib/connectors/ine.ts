import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseIneResponseToRows, type IneRow } from "./ine-parser";
import { ingestFileIntoTable, type IngestResult } from "../duckdb/ingest";

const INE_BASE = "https://servicios.ine.es/wstempus/js/ES";
const TMP_DIR = path.join(process.cwd(), "data", "tmp");
const FETCH_TIMEOUT_MS = 90_000;

export interface IneFetchParams {
  code: string;
  nult?: number;
}

function buildUrl({ code, nult }: IneFetchParams): string {
  const trimmed = code.trim();
  const isTable = /^\d+$/.test(trimmed);
  const fn = isTable ? "DATOS_TABLA" : "DATOS_SERIE";
  const url = new URL(`${INE_BASE}/${fn}/${encodeURIComponent(trimmed)}`);
  if (nult) url.searchParams.set("nult", String(nult));
  return url.toString();
}

async function fetchIne(params: IneFetchParams): Promise<unknown> {
  const url = buildUrl(params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`La API del INE ha respondido ${res.status} para el código "${params.code}".`);
  }

  return res.json();
}

export interface InePreview {
  columns: string[];
  preview: IneRow[];
  totalRows: number;
  datasetLabel?: string;
}

export async function previewIneDataset(params: IneFetchParams): Promise<InePreview> {
  const payload = await fetchIne(params);
  const rows = parseIneResponseToRows(payload);

  if (rows.length === 0) {
    throw new Error(`El código "${params.code}" no ha devuelto datos del INE.`);
  }

  return {
    columns: Object.keys(rows[0]),
    preview: rows.slice(0, 50),
    totalRows: rows.length,
    datasetLabel: rows[0].nombre,
  };
}

export async function importIneDataset(params: IneFetchParams): Promise<IngestResult> {
  const payload = await fetchIne(params);
  const rows = parseIneResponseToRows(payload);

  if (rows.length === 0) {
    throw new Error(`El código "${params.code}" no ha devuelto datos del INE.`);
  }

  await mkdir(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `${randomUUID()}.ndjson`);
  const ndjson = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(tmpPath, ndjson, "utf-8");

  try {
    return await ingestFileIntoTable(tmpPath, "json");
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
