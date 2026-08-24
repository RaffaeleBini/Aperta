import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseJsonStatToRows, type JsonStatRow } from "./eurostat-jsonstat";
import { ingestFileIntoTable, type IngestResult } from "../duckdb/ingest";

const EUROSTAT_BASE =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const TMP_DIR = path.join(process.cwd(), "data", "tmp");
const FETCH_TIMEOUT_MS = 90_000;
// Limite di sicurezza sul numero di celle del dataset (§9 spec: target ~1-2M righe).
const MAX_CELLS = 2_000_000;

export interface EurostatFetchParams {
  datasetCode: string;
  lang?: string;
  filters?: Record<string, string | string[]>;
}

function buildUrl({ datasetCode, lang = "EN", filters = {} }: EurostatFetchParams): string {
  const url = new URL(`${EUROSTAT_BASE}/${encodeURIComponent(datasetCode)}`);
  url.searchParams.set("format", "JSON");
  url.searchParams.set("lang", lang);
  for (const [key, value] of Object.entries(filters)) {
    for (const v of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, v);
    }
  }
  return url.toString();
}

async function fetchJsonStat(params: EurostatFetchParams) {
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
    throw new Error(
      `Eurostat API ha risposto ${res.status} per il dataset "${params.datasetCode}".`
    );
  }

  const payload = await res.json();

  const cellCount = Array.isArray(payload.size)
    ? payload.size.reduce((acc: number, s: number) => acc * s, 1)
    : 0;
  if (cellCount > MAX_CELLS) {
    throw new Error(
      `Il dataset "${params.datasetCode}" ha ${cellCount.toLocaleString()} celle, oltre il limite di ${MAX_CELLS.toLocaleString()}. Restringi i filtri (geo/time) prima di importare.`
    );
  }

  return payload;
}

export interface EurostatPreview {
  columns: string[];
  preview: JsonStatRow[];
  totalRows: number;
  datasetLabel?: string;
}

export async function previewEurostatDataset(
  params: EurostatFetchParams
): Promise<EurostatPreview> {
  const payload = await fetchJsonStat(params);
  const { columns, rows } = parseJsonStatToRows(payload);
  return {
    columns,
    preview: rows.slice(0, 50),
    totalRows: rows.length,
    datasetLabel: typeof payload.label === "string" ? payload.label : undefined,
  };
}

export async function importEurostatDataset(
  params: EurostatFetchParams
): Promise<IngestResult> {
  const payload = await fetchJsonStat(params);
  const { rows } = parseJsonStatToRows(payload);

  if (rows.length === 0) {
    throw new Error("Il dataset Eurostat non contiene righe valide per i filtri indicati.");
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
