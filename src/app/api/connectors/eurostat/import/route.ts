import { NextResponse } from "next/server";
import { importEurostatDataset } from "@/lib/connectors/eurostat";
import { eurostatImportSchema } from "@/lib/connectors/schemas";
import { createDatasetRecord } from "@/lib/duckdb/datasets";

export async function POST(req: Request) {
  const body = eurostatImportSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { name, description, ...sourceConfig } = body.data;

  try {
    const ingestResult = await importEurostatDataset(sourceConfig);
    const dataset = await createDatasetRecord({
      name,
      description,
      sourceType: "api_eurostat",
      tableName: ingestResult.tableName,
      rowCount: ingestResult.rowCount,
      columns: ingestResult.columns,
      rawOrigin: sourceConfig,
    });
    return NextResponse.json({ dataset }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 502 }
    );
  }
}
