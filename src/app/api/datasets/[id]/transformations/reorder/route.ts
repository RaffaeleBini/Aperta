import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { reorderSteps } from "@/lib/transformations/transformations";
import { reorderStepsSchema } from "@/lib/transformations/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const body = reorderStepsSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const steps = await reorderSteps(id, body.data.orderedStepIds);
    return NextResponse.json({ steps });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 400 }
    );
  }
}
