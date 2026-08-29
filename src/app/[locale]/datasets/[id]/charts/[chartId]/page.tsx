import { notFound } from "next/navigation";
import { getDataset } from "@/lib/duckdb/datasets";
import { getChart } from "@/lib/charts/charts";
import { ChartBuilderClient } from "@/components/charts/chart-builder-loader";

export default async function EditChartPage({
  params,
}: {
  params: Promise<{ id: string; chartId: string }>;
}) {
  const { id, chartId } = await params;
  const dataset = await getDataset(id);
  if (!dataset) notFound();

  const chart = await getChart(chartId);
  if (!chart || chart.dataset_id !== id) notFound();

  return <ChartBuilderClient datasetId={id} columns={dataset.schema_json} initialChart={chart} />;
}
