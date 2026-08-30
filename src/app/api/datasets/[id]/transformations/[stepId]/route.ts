import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import {
  deleteStep,
  listSteps,
  toTransformStep,
  updateStep,
} from "@/lib/transformations/transformations";
import { buildPipelineSql } from "@/lib/transformations/pipeline-builder";
import { validateStep } from "@/lib/transformations/validate-step";
import { paramsSchemaByStepType, updateStepSchema } from "@/lib/transformations/schemas";
import type { TransformStep } from "@/lib/transformations/types";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const body = updateStepSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const currentSteps = await listSteps(id);
  const existing = currentSteps.find((s) => s.id === stepId);
  if (!existing) {
    return NextResponse.json({ error: "Paso no encontrado." }, { status: 404 });
  }

  const paramsResult = paramsSchemaByStepType[existing.step_type].safeParse(body.data.params);
  if (!paramsResult.success) {
    return NextResponse.json({ error: paramsResult.error.flatten() }, { status: 400 });
  }

  const before = await buildPipelineSql(
    dataset.table_name,
    currentSteps.map(toTransformStep),
    { upToPosition: existing.position }
  );
  const errors = validateStep(
    { stepType: existing.step_type, params: paramsResult.data } as TransformStep,
    before.columns
  );
  if (errors.length > 0) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  try {
    const steps = await updateStep(id, stepId, paramsResult.data as Record<string, unknown>);
    return NextResponse.json({ steps });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  try {
    const steps = await deleteStep(id, stepId);
    return NextResponse.json({ steps });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 400 }
    );
  }
}
