import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { ingestFileIntoTable, type IngestResult, type IngestFormat } from "../duckdb/ingest";

const TMP_DIR = path.join(process.cwd(), "data", "tmp");

export type UploadKind = "csv" | "json" | "excel";

function detectKind(filename: string): UploadKind {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".csv") return "csv";
  if (ext === ".json") return "json";
  if (ext === ".xlsx" || ext === ".xls") return "excel";
  throw new Error(`Estensione file non supportata: "${ext}". Usa CSV, JSON o Excel.`);
}

/** Converte il primo foglio di un file Excel in un file NDJSON temporaneo. */
async function excelToNdjsonFile(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Il file Excel non contiene fogli.");
  }

  let headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = (row.values as unknown[]).slice(1); // ExcelJS: indice 0 sempre vuoto

    if (rowNumber === 1) {
      headers = values.map((v) => String(v ?? "").trim());
      return;
    }

    const record: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      const cell = values[i];
      record[header] = cell instanceof Date ? cell.toISOString() : (cell ?? null);
    });
    rows.push(record);
  });

  await mkdir(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `${randomUUID()}.ndjson`);
  await writeFile(tmpPath, rows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
  return tmpPath;
}

export async function importUploadedFile(
  filename: string,
  buffer: Buffer
): Promise<IngestResult> {
  const kind = detectKind(filename);

  let tmpPath: string;
  let format: IngestFormat;

  if (kind === "excel") {
    tmpPath = await excelToNdjsonFile(buffer);
    format = "json";
  } else {
    await mkdir(TMP_DIR, { recursive: true });
    tmpPath = path.join(TMP_DIR, `${randomUUID()}.${kind}`);
    await writeFile(tmpPath, buffer);
    format = kind;
  }

  try {
    return await ingestFileIntoTable(tmpPath, format);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
