import { NextResponse } from "next/server";
import { importGenericSource } from "@/lib/connectors/generic";
import { genericImportSchema } from "@/lib/connectors/schemas";
import { createDatasetRecord } from "@/lib/duckdb/datasets";

export async function POST(req: Request) {
  const body = genericImportSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { name, description, ...sourceConfig } = body.data;

  try {
    const ingestResult = await importGenericSource(sourceConfig);
    const dataset = await createDatasetRecord({
      name,
      description,
      sourceType: "api_generic",
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
