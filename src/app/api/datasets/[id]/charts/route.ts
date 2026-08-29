import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { createChart, listChartsByDataset } from "@/lib/charts/charts";
import { validateChartConfig } from "@/lib/charts/validate-config";
import { createChartSchema } from "@/lib/charts/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const charts = await listChartsByDataset(id);
  return NextResponse.json({ charts });
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

  const body = createChartSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const errors = validateChartConfig(body.data.config, dataset.schema_json);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  const chart = await createChart({
    datasetId: id,
    name: body.data.name,
    chartType: body.data.chartType,
    config: body.data.config,
  });
  return NextResponse.json({ chart }, { status: 201 });
}
