import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { createPivot, listPivotsByDataset } from "@/lib/pivot/pivots";
import { validatePivotConfig } from "@/lib/pivot/validate-config";
import { createPivotSchema } from "@/lib/pivot/schemas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset no encontrado." }, { status: 404 });
  }

  const pivots = await listPivotsByDataset(id);
  return NextResponse.json({ pivots });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset no encontrado." }, { status: 404 });
  }

  const body = createPivotSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const errors = validatePivotConfig(body.data.config, dataset.schema_json);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  const pivot = await createPivot({ datasetId: id, name: body.data.name, config: body.data.config });
  return NextResponse.json({ pivot }, { status: 201 });
}
