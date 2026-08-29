import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { query } from "@/lib/duckdb/client";
import { validateChartConfig } from "@/lib/charts/validate-config";
import { buildChartQuery } from "@/lib/charts/query-builder";
import { chartConfigSchema } from "@/lib/charts/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const body = chartConfigSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const errors = validateChartConfig(body.data, dataset.schema_json);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  try {
    const built = buildChartQuery(dataset.table_name, body.data);
    const rows = await query(built.sql, built.params);
    return NextResponse.json({ rows, columnMap: built.columnMap });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 500 }
    );
  }
}
