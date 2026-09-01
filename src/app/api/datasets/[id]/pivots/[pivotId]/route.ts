import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { deletePivot, getPivot, updatePivot } from "@/lib/pivot/pivots";
import { validatePivotConfig } from "@/lib/pivot/validate-config";
import { updatePivotSchema } from "@/lib/pivot/schemas";

async function resolvePivot(datasetId: string, pivotId: string) {
  const dataset = await getDataset(datasetId);
  if (!dataset) return { error: NextResponse.json({ error: "Dataset no encontrado." }, { status: 404 }) };

  const pivot = await getPivot(pivotId);
  if (!pivot || pivot.dataset_id !== datasetId) {
    return { error: NextResponse.json({ error: "Tabla dinámica no encontrada." }, { status: 404 }) };
  }

  return { dataset, pivot };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; pivotId: string }> }
) {
  const { id, pivotId } = await params;
  const result = await resolvePivot(id, pivotId);
  if (result.error) return result.error;
  return NextResponse.json({ pivot: result.pivot });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; pivotId: string }> }
) {
  const { id, pivotId } = await params;
  const result = await resolvePivot(id, pivotId);
  if (result.error) return result.error;

  const body = updatePivotSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  if (body.data.config) {
    const errors = validatePivotConfig(body.data.config, result.dataset.schema_json);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 });
    }
  }

  const pivot = await updatePivot(pivotId, body.data);
  return NextResponse.json({ pivot });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; pivotId: string }> }
) {
  const { id, pivotId } = await params;
  const result = await resolvePivot(id, pivotId);
  if (result.error) return result.error;

  await deletePivot(pivotId);
  return NextResponse.json({ ok: true });
}
