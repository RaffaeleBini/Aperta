import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { addStep, listSteps, toTransformStep } from "@/lib/transformations/transformations";
import { buildPipelineSql } from "@/lib/transformations/pipeline-builder";
import { validateStep } from "@/lib/transformations/validate-step";
import { transformStepSchema } from "@/lib/transformations/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const steps = await listSteps(id);
  return NextResponse.json({ steps });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const body = transformStepSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const currentSteps = await listSteps(id);
  const current = await buildPipelineSql(dataset.table_name, currentSteps.map(toTransformStep));
  const errors = validateStep(body.data, current.columns);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  try {
    const steps = await addStep(id, body.data.stepType, body.data.params);
    return NextResponse.json({ steps }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 400 }
    );
  }
}
