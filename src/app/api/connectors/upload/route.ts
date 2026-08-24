import { NextResponse } from "next/server";
import { importUploadedFile } from "@/lib/connectors/file-import";
import { createDatasetRecord } from "@/lib/duckdb/datasets";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  const name = formData.get("name");
  const description = formData.get("description");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file caricato." }, { status: 400 });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Il nome del dataset è obbligatorio." }, { status: 400 });
  }

  const sourceType =
    file.name.toLowerCase().endsWith(".csv")
      ? "file_csv"
      : file.name.toLowerCase().endsWith(".json")
        ? "file_json"
        : "file_excel";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ingestResult = await importUploadedFile(file.name, buffer);
    const dataset = await createDatasetRecord({
      name,
      description: typeof description === "string" ? description : undefined,
      sourceType,
      tableName: ingestResult.tableName,
      rowCount: ingestResult.rowCount,
      columns: ingestResult.columns,
      rawOrigin: { filename: file.name },
    });
    return NextResponse.json({ dataset }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 502 }
    );
  }
}
