import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { query } from "@/lib/duckdb/client";
import { listSteps, toTransformStep } from "@/lib/transformations/transformations";
import { buildPipelineSql } from "@/lib/transformations/pipeline-builder";
import { validateStep } from "@/lib/transformations/validate-step";
import { previewTransformSchema } from "@/lib/transformations/schemas";

const PREVIEW_ROW_LIMIT = 100;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const body = previewTransformSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { upToPosition, draftStep } = body.data;
  const savedSteps = await listSteps(id);

  if (draftStep) {
    const before = await buildPipelineSql(dataset.table_name, savedSteps.map(toTransformStep), {
      upToPosition,
    });
    const errors = validateStep(draftStep, before.columns);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 });
    }
  }

  try {
    const built = await buildPipelineSql(dataset.table_name, savedSteps.map(toTransformStep), {
      upToPosition,
      draftStep,
    });
    const [rows, [{ total }]] = await Promise.all([
      query(`SELECT * FROM (${built.sql}) preview_sub LIMIT ${PREVIEW_ROW_LIMIT}`, built.params),
      query<{ total: number }>(
        `SELECT count(*)::INTEGER AS total FROM (${built.sql}) preview_sub`,
        built.params
      ),
    ]);
    return NextResponse.json({ columns: built.columns, rows, totalRows: total });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 400 }
    );
  }
}
