import { NextResponse } from "next/server";
import { effectiveTableName, getDataset } from "@/lib/duckdb/datasets";
import { getPivot } from "@/lib/pivot/pivots";
import { runPivotQuery, PivotTooLargeError } from "@/lib/pivot/run-pivot";
import { rowsToCsv } from "@/lib/csv";

const EXPORT_ROW_LIMIT = 200_000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; pivotId: string }> }
) {
  const { id, pivotId } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset no encontrado." }, { status: 404 });
  }

  const pivot = await getPivot(pivotId);
  if (!pivot || pivot.dataset_id !== id) {
    return NextResponse.json({ error: "Tabla dinámica no encontrada." }, { status: 404 });
  }

  try {
    const result = await runPivotQuery(effectiveTableName(dataset), pivot.config_json, {
      limit: EXPORT_ROW_LIMIT,
    });
    const csv = rowsToCsv(result.columns, result.rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${pivot.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof PivotTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
