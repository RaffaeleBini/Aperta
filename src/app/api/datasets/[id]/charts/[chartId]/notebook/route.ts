import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { getChart } from "@/lib/charts/charts";
import { listSteps } from "@/lib/transformations/transformations";
import { buildNotebookExport } from "@/lib/notebook/build-notebook";
import { buildZip } from "@/lib/notebook/zip";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id, chartId } = await params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset no encontrado." }, { status: 404 });
  }

  const chart = await getChart(chartId);
  if (!chart || chart.dataset_id !== id) {
    return NextResponse.json({ error: "Gráfico no encontrado." }, { status: 404 });
  }

  const steps = await listSteps(id);
  const { files, zipBaseName } = await buildNotebookExport(dataset, steps, { kind: "chart", chart });
  const zip = await buildZip(files);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipBaseName}.zip"`,
    },
  });
}
