import { NextResponse } from "next/server";
import { effectiveTableName, getDataset } from "@/lib/duckdb/datasets";
import { validatePivotConfig } from "@/lib/pivot/validate-config";
import { runPivotQuery, PivotTooLargeError } from "@/lib/pivot/run-pivot";
import { previewPivotSchema } from "@/lib/pivot/schemas";

const PREVIEW_ROW_LIMIT = 100;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset no encontrado." }, { status: 404 });
  }

  const body = previewPivotSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const errors = validatePivotConfig(body.data, dataset.schema_json);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  try {
    const result = await runPivotQuery(effectiveTableName(dataset), body.data, { limit: PREVIEW_ROW_LIMIT });
    return NextResponse.json(result);
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
