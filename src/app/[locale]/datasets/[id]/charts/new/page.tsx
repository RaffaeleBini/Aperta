import { notFound } from "next/navigation";
import { getDataset } from "@/lib/duckdb/datasets";
import { ChartBuilderClient } from "@/components/charts/chart-builder-loader";

export default async function NewChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) notFound();

  return <ChartBuilderClient datasetId={id} columns={dataset.schema_json} />;
}
