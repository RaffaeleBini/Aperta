import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { deleteChart, getChart, updateChart } from "@/lib/charts/charts";
import { validateChartConfig } from "@/lib/charts/validate-config";
import { updateChartSchema } from "@/lib/charts/schemas";

async function resolveChart(datasetId: string, chartId: string) {
  const dataset = await getDataset(datasetId);
  if (!dataset) return { error: NextResponse.json({ error: "Dataset non trovato." }, { status: 404 }) };

  const chart = await getChart(chartId);
  if (!chart || chart.dataset_id !== datasetId) {
    return { error: NextResponse.json({ error: "Gráfico no encontrado." }, { status: 404 }) };
  }

  return { dataset, chart };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id, chartId } = await params;
  const result = await resolveChart(id, chartId);
  if (result.error) return result.error;
  return NextResponse.json({ chart: result.chart });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id, chartId } = await params;
  const result = await resolveChart(id, chartId);
  if (result.error) return result.error;

  const body = updateChartSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  if (body.data.config) {
    const errors = validateChartConfig(body.data.config, result.dataset.schema_json);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors }, { status: 400 });
    }
  }

  const chart = await updateChart(chartId, body.data);
  return NextResponse.json({ chart });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id, chartId } = await params;
  const result = await resolveChart(id, chartId);
  if (result.error) return result.error;

  await deleteChart(chartId);
  return NextResponse.json({ ok: true });
}
